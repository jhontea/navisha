package currency

import "fmt"

// crossRate computes a base→target rate from a USD-keyed rates table.
// `usdRates[X]` is the price of 1 USD expressed in X (e.g. usdRates["IDR"]=15500).
// Therefore `base→target = usdRates[target] / usdRates[base]`.
func crossRate(usdRates map[string]float64, base, target string) (float64, error) {
	if base == target {
		return 1.0, nil
	}
	b, ok := usdRates[base]
	if !ok || b == 0 {
		return 0, fmt.Errorf("currency.crossRate: missing or zero rate for %s", base)
	}
	t, ok := usdRates[target]
	if !ok {
		return 0, fmt.Errorf("currency.crossRate: missing rate for %s", target)
	}
	return t / b, nil
}
