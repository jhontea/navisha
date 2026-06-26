package jwt

import (
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
	return s.generate(userID, s.refreshSecret, s.refreshTTL)
}

func (s *Service) ValidateAccessToken(tokenStr string) (string, error) {
	return s.validate(tokenStr, s.accessSecret)
}

func (s *Service) ValidateRefreshToken(tokenStr string) (string, error) {
	return s.validate(tokenStr, s.refreshSecret)
}

func (s *Service) generate(userID string, secret []byte, ttl time.Duration) (string, error) {
	now := time.Now()
	c := &claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
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
	token, err := jwt.ParseWithClaims(tokenStr, &claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return secret, nil
	}, jwt.WithIssuer(s.issuer), jwt.WithLeeway(s.Leeway))
	if err != nil {
		return "", fmt.Errorf("jwt.validate: %w", err)
	}

	c, ok := token.Claims.(*claims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("jwt.validate: invalid claims")
	}
	return c.UserID, nil
}
