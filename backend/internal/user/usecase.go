package user

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
func (u *Usecase) GoogleAuthURL(state string) string {
	return u.oauthConfig.AuthCodeURL(state, gooauth2.AccessTypeOnline)
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

	tokens, err := u.issueTokens(usr.ID)
	if err != nil {
		return nil, nil, err
	}

	return usr, tokens, nil
}

// Me returns the user by ID (called by the /auth/me endpoint).
func (u *Usecase) Me(id string) (*User, error) {
	usr, err := u.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("user.Me: %w", err)
	}
	return usr, nil
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
