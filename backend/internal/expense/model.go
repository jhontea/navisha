package expense

import "time"

type Expense struct {
	ID              string
	TripID          string
	ActivityID      string // optional — links expense to a specific activity
	Title           string
	Amount          float64
	Currency        string
	ConvertedAmount float64
	BaseCurrency    string
	Category        string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Summary struct {
	TotalBase    float64
	BaseCurrency string
	ByCategory   []CategoryTotal
}

type CategoryTotal struct {
	Category string
	Total    float64
}
