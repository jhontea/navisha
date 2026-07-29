package currency

import "context"

// Repository abstracts the rate source (Frankfurter API + Redis cache).
type Repository interface {
	GetRate(ctx context.Context, base, target string) (*Rate, error)
	GetRates(ctx context.Context, base string) ([]Rate, error)
}
