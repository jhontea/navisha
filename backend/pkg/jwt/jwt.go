package jwt

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Service struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
	issuer        string
	Leeway        time.Duration
}

type claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

type RefreshTokenDetails struct {
	UserID    string
	SessionID string
	ExpiresAt time.Time
}

func NewService(accessSecret, refreshSecret string, accessTTL, refreshTTL int) *Service {
	return &Service{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     time.Duration(accessTTL) * time.Second,
		refreshTTL:    time.Duration(refreshTTL) * time.Second,
		issuer:        "navisha",
		Leeway:        5 * time.Second,
	}
}

func (s *Service) GenerateAccessToken(userID string) (string, error) {
	return s.generate(userID, s.accessSecret, s.accessTTL)
}

func (s *Service) GenerateRefreshToken(userID string) (string, error) {
	sessionID, err := randomID()
	if err != nil {
		return "", fmt.Errorf("jwt.GenerateRefreshToken: %w", err)
	}
	token, _, err := s.GenerateRefreshTokenForSession(userID, sessionID)
	return token, err
}

func (s *Service) GenerateRefreshTokenForSession(userID, sessionID string) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.refreshTTL)
	token, err := s.generateWithID(userID, sessionID, s.refreshSecret, s.refreshTTL)
	if err != nil {
		return "", time.Time{}, err
	}
	return token, expiresAt, nil
}

func (s *Service) ValidateAccessToken(tokenStr string) (string, error) {
	return s.validate(tokenStr, s.accessSecret)
}

func (s *Service) ValidateRefreshToken(tokenStr string) (string, error) {
	return s.validate(tokenStr, s.refreshSecret)
}

func (s *Service) ValidateRefreshTokenDetails(tokenStr string) (*RefreshTokenDetails, error) {
	token, err := s.parse(tokenStr, s.refreshSecret)
	if err != nil {
		return nil, err
	}
	c, ok := token.Claims.(*claims)
	if !ok || !token.Valid || c.ID == "" || c.ExpiresAt == nil {
		return nil, fmt.Errorf("jwt.validate_refresh_details: invalid claims")
	}
	return &RefreshTokenDetails{UserID: c.UserID, SessionID: c.ID, ExpiresAt: c.ExpiresAt.Time}, nil
}

func (s *Service) generate(userID string, secret []byte, ttl time.Duration) (string, error) {
	return s.generateWithID(userID, "", secret, ttl)
}

func (s *Service) generateWithID(userID, tokenID string, secret []byte, ttl time.Duration) (string, error) {
	now := time.Now()
	c := &claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Issuer:    s.issuer,
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("jwt.generate: %w", err)
	}
	return signed, nil
}

func (s *Service) validate(tokenStr string, secret []byte) (string, error) {
	token, err := s.parse(tokenStr, secret)
	if err != nil {
		return "", err
	}

	c, ok := token.Claims.(*claims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("jwt.validate: invalid claims")
	}
	return c.UserID, nil
}

func (s *Service) parse(tokenStr string, secret []byte) (*jwt.Token, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return secret, nil
	}, jwt.WithIssuer(s.issuer), jwt.WithLeeway(s.Leeway))
	if err != nil {
		return nil, fmt.Errorf("jwt.validate: %w", err)
	}
	return token, nil
}

func randomID() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("random id: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
