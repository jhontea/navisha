package llm

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const okBody = `{"choices":[{"message":{"role":"assistant","content":"ok"},"finish_reason":"stop"}]}`

func retryClient(url string) *Client {
	c := NewClient(ProviderDeepSeek, "k", "m", url)
	c.backoffBase = time.Millisecond
	return c
}

func chat(ctx context.Context, c *Client) (string, error) {
	return c.ChatCompletion(ctx, ChatRequest{Messages: []Message{{Role: "user", Content: "hi"}}})
}

func TestChatCompletion_RetriesThenSucceeds(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte(okBody))
	}))
	defer srv.Close()

	got, err := chat(context.Background(), retryClient(srv.URL))
	if err != nil || got != "ok" {
		t.Fatalf("got %q, %v", got, err)
	}
	if calls.Load() != 3 {
		t.Errorf("calls = %d, want 3", calls.Load())
	}
}

func TestChatCompletion_StopsAtRetryLimit(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	if _, err := chat(context.Background(), retryClient(srv.URL)); err == nil {
		t.Fatal("expected error")
	}
	if calls.Load() != 1+maxRetries {
		t.Errorf("calls = %d, want %d", calls.Load(), 1+maxRetries)
	}
}

func TestChatCompletion_DoesNotRetryOtherClientErrors(t *testing.T) {
	for _, status := range []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError} {
		var calls atomic.Int32
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(status)
		}))
		if _, err := chat(context.Background(), retryClient(srv.URL)); err == nil {
			t.Fatalf("status %d: expected error", status)
		}
		srv.Close()
		if calls.Load() != 1 {
			t.Errorf("status %d: calls = %d, want 1", status, calls.Load())
		}
	}
}

func TestChatCompletion_HonoursRetryAfter(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.Write([]byte(okBody))
	}))
	defer srv.Close()

	start := time.Now()
	if _, err := chat(context.Background(), retryClient(srv.URL)); err != nil {
		t.Fatal(err)
	}
	if d := time.Since(start); d < time.Second {
		t.Errorf("waited %v, want >= 1s from Retry-After", d)
	}
}

func TestChatCompletion_CancelledDuringBackoffStops(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Retry-After", "10")
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	start := time.Now()
	_, err := chat(ctx, retryClient(srv.URL))
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err = %v, want deadline exceeded", err)
	}
	if time.Since(start) > 2*time.Second || calls.Load() != 1 {
		t.Errorf("took %v with %d calls", time.Since(start), calls.Load())
	}
}

func TestChatCompletion_RejectsOversizedBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"choices":[{"message":{"content":"`))
		w.Write([]byte(strings.Repeat("a", maxResponseBytes)))
		w.Write([]byte(`"}}]}`))
	}))
	defer srv.Close()

	_, err := chat(context.Background(), retryClient(srv.URL))
	if err == nil || !strings.Contains(err.Error(), "exceeds") {
		t.Fatalf("err = %v, want size error", err)
	}
	if strings.Contains(err.Error(), "aaaa") {
		t.Error("error leaks response body")
	}
}

func TestChatCompletion_LimitsConcurrency(t *testing.T) {
	var inflight, peak atomic.Int32
	release := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := inflight.Add(1)
		for {
			p := peak.Load()
			if n <= p || peak.CompareAndSwap(p, n) {
				break
			}
		}
		<-release
		inflight.Add(-1)
		w.Write([]byte(okBody))
	}))
	defer srv.Close()

	c := retryClient(srv.URL).WithMaxConcurrent(2)
	done := make(chan error, 6)
	for range 6 {
		go func() { _, err := chat(context.Background(), c); done <- err }()
	}
	time.Sleep(300 * time.Millisecond)
	if got := inflight.Load(); got != 2 {
		t.Errorf("in flight = %d, want 2", got)
	}
	close(release)
	for range 6 {
		if err := <-done; err != nil {
			t.Fatal(err)
		}
	}
	if peak.Load() != 2 {
		t.Errorf("peak = %d, want 2", peak.Load())
	}
}

func TestChatCompletion_CancelledWhileQueued(t *testing.T) {
	release := make(chan struct{})
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		<-release
		w.Write([]byte(okBody))
	}))
	defer srv.Close()
	defer close(release)

	c := retryClient(srv.URL).WithMaxConcurrent(1)
	go chat(context.Background(), c)
	for calls.Load() == 0 {
		time.Sleep(5 * time.Millisecond)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_, err := chat(ctx, c)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err = %v, want deadline exceeded", err)
	}
	if calls.Load() != 1 {
		t.Errorf("queued request reached the server (calls = %d)", calls.Load())
	}
}
