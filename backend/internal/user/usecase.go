package user

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
	"github.com/ahmadhafizh/navisha/backend/pkg/oauth"
	gooauth2 "golang.org/x/oauth2"
)

// ErrNotAllowed is returned when an email is not in the whitelist.
var ErrNotAllowed = errors.New("email not allowed")

type Tokens struct {
	AccessToken  string
	RefreshToken string
}

// UsecaseInterface defines the contract for the user domain's business logic.
// Handler depends on this interface so it can be tested with a mock.
type UsecaseInterface interface {
	GoogleAuthURL(state string) string
	GoogleLogin(ctx context.Context, code string) (*User, *Tokens, error)
	Me(id string) (*User, error)
	RefreshTokens(refreshToken string) (*Tokens, error)
}

type Usecase struct {
	repo          Repository
	jwtSvc        *jwt.Service
	oauthConfig   *gooauth2.Config
	allowedEmails []string // if non-empty, only these emails can log in
}

func NewUsecase(repo Repository, jwtSvc *jwt.Service, oauthConfig *gooauth2.Config, allowedEmails []string) *Usecase {
	return &Usecase{repo: repo, jwtSvc: jwtSvc, oauthConfig: oauthConfig, allowedEmails: allowedEmails}
}

// GoogleAuthURL returns the Google consent URL the user should be redirected to.
// AccessTypeOffline + ApprovalForce (prompt=consent) ensure Google returns a
// refresh token so the backend can call the Calendar API on the user's behalf
// (F4). prompt=consent is required because Google only returns a refresh token
// on the first consent unless re-consent is forced.
func (u *Usecase) GoogleAuthURL(state string) string {
	return u.oauthConfig.AuthCodeURL(state,
		gooauth2.AccessTypeOffline,
		gooauth2.ApprovalForce,
	)
}

// isEmailAllowed returns true when the whitelist is empty (open access)
// or the email is explicitly listed.
func (u *Usecase) isEmailAllowed(email string) bool {
	if len(u.allowedEmails) == 0 {
		return true
	}
	for _, allowed := range u.allowedEmails {
		if strings.EqualFold(allowed, email) {
			return true
		}
	}
	return false
}

// GoogleLogin exchanges the OAuth code for a Google user, upserts the user in
// the DB, and issues JWT access + refresh tokens.
func (u *Usecase) GoogleLogin(ctx context.Context, code string) (*User, *Tokens, error) {
	token, err := u.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, nil, fmt.Errorf("user.GoogleLogin: exchange code: %w", err)
	}

	info, err := fetchGoogleUserInfo(ctx, u.oauthConfig, token)
	if err != nil {
		return nil, nil, fmt.Errorf("user.GoogleLogin: fetch userinfo: %w", err)
	}

	// Whitelist check — reject before touching the DB.
	if !u.isEmailAllowed(info.Email) {
		return nil, nil, ErrNotAllowed
	}

	usr, err := u.repo.Upsert(&User{
		GoogleID:  info.ID,
		Email:     info.Email,
		Name:      info.Name,
		AvatarURL: info.Picture,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("user.GoogleLogin: upsert: %w", err)
	}

	// Persist Google tokens so the backend can call Google APIs (Calendar) on
	// the user's behalf (F4). A non-fatal failure here must not block login —
	// the user simply won't have Calendar export until they re-authorize.
	if err := u.repo.UpdateGoogleTokens(usr.ID, token, grantedScopes(token)); err != nil {
		log.Printf("user.GoogleLogin: store google tokens for %s: %v", usr.ID, err)
	}

	tokens, err := u.issueTokens(usr.ID)
	if err != nil {
		return nil, nil, err
	}

	return usr, tokens, nil
}

// grantedScopes extracts the space-separated "scope" field Google returns in
// the token exchange response, if present.
func grantedScopes(token *gooauth2.Token) []string {
	raw, ok := token.Extra("scope").(string)
	if !ok || raw == "" {
		return nil
	}
	return strings.Fields(raw)
}

// Me returns the user by ID (called by the /auth/me endpoint).
func (u *Usecase) Me(id string) (*User, error) {
	usr, err := u.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("user.Me: %w", err)
	}
	return usr, nil
}

// ErrNoGoogleToken is returned when a user has no stored Google refresh token,
// so the backend cannot act on their behalf (they must re-authorize).
var ErrNoGoogleToken = errors.New("user: no google token")

// GoogleToken returns the user's stored Google OAuth token for calling Google
// APIs on their behalf (F4). Returns ErrNoGoogleToken when no refresh token is
// stored. Implements calendarexport.TokenProvider.
func (u *Usecase) GoogleToken(userID string) (*gooauth2.Token, error) {
	token, _, err := u.repo.GetGoogleToken(userID)
	if err != nil {
		return nil, err
	}
	if token == nil || token.RefreshToken == "" {
		return nil, ErrNoGoogleToken
	}
	return token, nil
}

// RefreshTokens validates a refresh token and issues a new token pair.
func (u *Usecase) RefreshTokens(refreshToken string) (*Tokens, error) {
	userID, err := u.jwtSvc.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("user.RefreshTokens: invalid refresh token: %w", err)
	}
	tokens, err := u.issueTokens(userID)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}

func (u *Usecase) issueTokens(userID string) (*Tokens, error) {
	access, err := u.jwtSvc.GenerateAccessToken(userID)
	if err != nil {
		return nil, fmt.Errorf("user.issueTokens: access: %w", err)
	}
	refresh, err := u.jwtSvc.GenerateRefreshToken(userID)
	if err != nil {
		return nil, fmt.Errorf("user.issueTokens: refresh: %w", err)
	}
	return &Tokens{AccessToken: access, RefreshToken: refresh}, nil
}

func fetchGoogleUserInfo(ctx context.Context, cfg *gooauth2.Config, token *gooauth2.Token) (*oauth.GoogleUserInfo, error) {
	client := cfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("fetchGoogleUserInfo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetchGoogleUserInfo: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("fetchGoogleUserInfo: read body: %w", err)
	}

	var info oauth.GoogleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("fetchGoogleUserInfo: unmarshal: %w", err)
	}
	return &info, nil
}
