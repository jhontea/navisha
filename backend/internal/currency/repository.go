package currency

// Repository abstracts the rate source (Frankfurter API + Redis cache).
type Repository interface {
	GetRate(base, target string) (*Rate, error)
	GetRates(base string) ([]Rate, error)
}
