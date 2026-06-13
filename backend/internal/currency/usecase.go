package currency

import "fmt"

type UsecaseInterface interface {
	Rates(base string) ([]Rate, error)
	Convert(from, to string, amount float64) (converted float64, rate float64, err error)
}

type Usecase struct {
	repo Repository
}

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
