package quota

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

func newTestChecker(t *testing.T) (*Checker, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return NewChecker(rdb, nil), mr // nil DB: the default limit (10) applies
}

func echoCtx(ctx context.Context) echo.Context {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/trips/generate", nil).WithContext(ctx)
	return echo.New().NewContext(req, httptest.NewRecorder())
}

// The counter must always get an expiry, set in the same MULTI as the INCR.
func TestConsumeSetsDailyExpiry(t *testing.T) {
	c, mr := newTestChecker(t)
	if err := c.Consume(echoCtx(context.Background()), "user-1"); err != nil {
		t.Fatalf("Consume: %v", err)
	}
	key := userKey("user-1")
	if got, _ := mr.Get(key); got != "1" {
		t.Fatalf("counter = %q, want 1", got)
	}
	if ttl := mr.TTL(key); ttl <= 0 {
		t.Fatalf("TTL = %v, want an expiry until next midnight UTC", ttl)
	}
}

// Refund runs after an LLM timeout or a dropped client, when the request
// context is already cancelled; the counter must still go down.
func TestRefundWorksAfterRequestContextIsDone(t *testing.T) {
	c, mr := newTestChecker(t)
	if err := c.Consume(echoCtx(context.Background()), "user-1"); err != nil {
		t.Fatal(err)
	}

	done, cancel := context.WithCancel(context.Background())
	cancel()
	c.Refund(echoCtx(done), "user-1")

	if got, _ := mr.Get(userKey("user-1")); got != "0" {
		t.Fatalf("counter after refund = %q, want 0", got)
	}
}

func TestConsumeBlocksPastTheLimit(t *testing.T) {
	c, _ := newTestChecker(t)
	for i := 0; i < defaultLimit; i++ {
		if err := c.Consume(echoCtx(context.Background()), "user-1"); err != nil {
			t.Fatalf("call %d: %v", i+1, err)
		}
	}
	if err := c.Consume(echoCtx(context.Background()), "user-1"); err == nil || err.Code != http.StatusTooManyRequests {
		t.Fatalf("call %d err = %v, want 429", defaultLimit+1, err)
	}
}
