package currency

import "fmt"

// UsecaseInterface defines the business logic for currency operations.
type UsecaseInterface interface {
	// Rates returns exchange rates for all supported currencies with the given base.
	Rates(base string) ([]Rate, error)
	// Convert converts an amount from one currency to another, returning the
	// converted amount and the exchange rate used.
	Convert(from, to string, amount float64) (converted float64, rate float64, err error)
}

// Usecase implements currency business logic.
type Usecase struct {
	repo Repository
}

// NewUsecase creates a new currency usecase with the given repository.
func NewUsecase(repo Repository) *Usecase {
	return &Usecase{repo: repo}
}

var _ UsecaseInterface = (*Usecase)(nil)

func (u *Usecase) Rates(base string) ([]Rate, error) {
	if !IsSupported(base) {
		return nil, ErrUnsupported
	}
	return u.repo.GetRates(base)
}

func (u *Usecase) Convert(from, to string, amount float64) (float64, float64, error) {
	if amount < 0 {
		return 0, 0, fmt.Errorf("currency.Convert: negative amount")
	}
	r, err := u.repo.GetRate(from, to)
	if err != nil {
		return 0, 0, err
	}
	return amount * r.Rate, r.Rate, nil
}
