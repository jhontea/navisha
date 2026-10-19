package currency

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	pkgcurrency "github.com/jhontea/navisha/backend/pkg/currency"
	"github.com/redis/go-redis/v9"
)

// fakeRates is an upstream stand-in that counts calls and can block or fail.
type fakeRates struct {
	calls   atomic.Int32
	err     error
	release chan struct{} // when set, Latest waits for it
}

func (f *fakeRates) Latest(context.Context, []string) (*pkgcurrency.LatestRates, error) {
	f.calls.Add(1)
	if f.release != nil {
		<-f.release
	}
	if f.err != nil {
		return nil, f.err
	}
	return &pkgcurrency.LatestRates{Date: time.Now(), Rates: map[string]float64{"IDR": 16000, "JPY": 150}}, nil
}

func newTestRepo(t *testing.T, upstream ratesFetcher) (*redisRepository, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return &redisRepository{rdb: rdb, client: upstream, ttl: time.Hour}, mr
}

func TestFetchUSD_ConcurrentMissesShareOneUpstreamCall(t *testing.T) {
	upstream := &fakeRates{release: make(chan struct{})}
	repo, _ := newTestRepo(t, upstream)

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := repo.fetchUSD(context.Background()); err != nil {
				t.Errorf("fetchUSD: %v", err)
			}
		}()
	}
	time.Sleep(50 * time.Millisecond) // let every goroutine reach the miss
	close(upstream.release)
	wg.Wait()

	if n := upstream.calls.Load(); n != 1 {
		t.Fatalf("upstream calls = %d, want 1", n)
	}
}

func TestFetchUSD_StoresLastGoodTableWithoutExpiry(t *testing.T) {
	repo, mr := newTestRepo(t, &fakeRates{})
	if _, err := repo.fetchUSD(context.Background()); err != nil {
		t.Fatal(err)
	}
	if ttl := mr.TTL(usdCacheKey); ttl != time.Hour {
		t.Errorf("cache TTL = %v, want 1h", ttl)
	}
	if !mr.Exists(usdLastKey) || mr.TTL(usdLastKey) != 0 {
		t.Errorf("%s should exist without a TTL (ttl=%v)", usdLastKey, mr.TTL(usdLastKey))
	}
}

func TestFetchUSD_UpstreamDownServesLastKnownRates(t *testing.T) {
	repo, mr := newTestRepo(t, &fakeRates{err: errors.New("quota exceeded")})
	last, _ := json.Marshal(cachedRates{Date: time.Now().Add(-48 * time.Hour), Rates: map[string]float64{"USD": 1, "IDR": 15500}})
	_ = mr.Set(usdLastKey, string(last))

	got, err := repo.fetchUSD(context.Background())
	if err != nil {
		t.Fatalf("fetchUSD: %v", err)
	}
	if got.Rates["IDR"] != 15500 {
		t.Fatalf("IDR = %v, want the last known 15500", got.Rates["IDR"])
	}
	// Cached briefly so the failing upstream is not hit on every request.
	if ttl := mr.TTL(usdCacheKey); ttl <= 0 || ttl > staleRetry {
		t.Errorf("fallback cache TTL = %v, want up to %v", ttl, staleRetry)
	}
}

func TestFetchUSD_UpstreamDownWithoutFallbackFails(t *testing.T) {
	repo, _ := newTestRepo(t, &fakeRates{err: errors.New("quota exceeded")})
	if _, err := repo.fetchUSD(context.Background()); err == nil {
		t.Fatal("want an error when the upstream fails and no table was ever stored")
	}
}
