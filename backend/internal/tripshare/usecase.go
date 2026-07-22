package tripshare

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"time"
)

var allowedDurations = map[int]time.Duration{
	1: 24 * time.Hour, 3: 3 * 24 * time.Hour, 7: 7 * 24 * time.Hour,
	14: 14 * 24 * time.Hour, 30: 30 * 24 * time.Hour,
}

type LinkResult struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Usecase struct {
	repo   Repository
	secret []byte
	now    func() time.Time
}

func NewUsecase(repo Repository, secret string) *Usecase {
	return &Usecase{repo: repo, secret: []byte(secret), now: time.Now}
}

func (u *Usecase) Create(ctx context.Context, userID, tripID string, durationDays int) (*LinkResult, error) {
	duration, ok := allowedDurations[durationDays]
	if !ok {
		return nil, ErrInvalidDuration
	}
	link, err := u.repo.Create(ctx, tripID, userID, u.now().UTC().Add(duration))
	if err != nil {
		return nil, err
	}
	return u.result(link), nil
}

func (u *Usecase) GetActive(ctx context.Context, userID, tripID string) (*LinkResult, error) {
	link, err := u.repo.FindActive(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	return u.result(link), nil
}

func (u *Usecase) Revoke(ctx context.Context, userID, tripID string) error {
	return u.repo.Revoke(ctx, tripID, userID)
}

func (u *Usecase) Resolve(ctx context.Context, token string) (*PublicItinerary, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || !hmac.Equal([]byte(parts[1]), []byte(u.signature(parts[0]))) {
		return nil, ErrInvalidToken
	}
	return u.repo.Resolve(ctx, parts[0])
}

func (u *Usecase) result(link *Link) *LinkResult {
	return &LinkResult{Token: link.ID + "." + u.signature(link.ID), ExpiresAt: link.ExpiresAt}
}

func (u *Usecase) signature(id string) string {
	mac := hmac.New(sha256.New, u.secret)
	mac.Write([]byte("navisha-trip-share:" + id))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
