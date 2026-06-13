package currency

import (
	"errors"
	"testing"
)

type mockRepo struct {
	rate     *Rate
	rateErr  error
	rates    []Rate
	ratesErr error
}

func (m *mockRepo) GetRate(_, _ string) (*Rate, error)  { return m.rate, m.rateErr }
func (m *mockRepo) GetRates(_ string) ([]Rate, error)   { return m.rates, m.ratesErr }

func setup() func() {
	prev := SupportedCurrencies
	SupportedCurrencies = []string{"IDR", "USD", "JPY"}
	return func() { SupportedCurrencies = prev }
}

func TestRates_Unsupported(t *testing.T) {
	defer setup()()
	u := NewUsecase(&mockRepo{})
	if _, err := u.Rates("EUR"); !errors.Is(err, ErrUnsupported) {
		t.Errorf("err = %v, want ErrUnsupported", err)
	}
}

func TestRates_Success(t *testing.T) {
	defer setup()()
	expected := []Rate{{Base: "IDR", Target: "USD", Rate: 0.000064}}
	u := NewUsecase(&mockRepo{rates: expected})
	got, err := u.Rates("IDR")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(got) != 1 || got[0].Target != "USD" {
		t.Errorf("got %+v, want %+v", got, expected)
	}
}

func TestConvert_Success(t *testing.T) {
	defer setup()()
	u := NewUsecase(&mockRepo{rate: &Rate{Base: "USD", Target: "IDR", Rate: 15500.0}})
	got, rate, err := u.Convert("USD", "IDR", 10.0)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if rate != 15500.0 {
		t.Errorf("rate = %v, want 15500", rate)
	}
	if got != 155000.0 {
		t.Errorf("converted = %v, want 155000", got)
	}
}

func TestConvert_NegativeAmount(t *testing.T) {
	u := NewUsecase(&mockRepo{})
	if _, _, err := u.Convert("USD", "IDR", -5); err == nil {
		t.Error("expected error for negative amount")
	}
}

func TestConvert_RepoErr(t *testing.T) {
	u := NewUsecase(&mockRepo{rateErr: ErrUnsupported})
	if _, _, err := u.Convert("USD", "IDR", 10); !errors.Is(err, ErrUnsupported) {
		t.Errorf("err = %v, want ErrUnsupported", err)
	}
}
