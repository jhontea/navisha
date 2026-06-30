package expense

import "time"

// Category represents the type of expense.
type Category string

const (
	CategoryAccommodation Category = "accommodation"
	CategoryTransport     Category = "transport"
	CategoryFood          Category = "food"
	CategoryActivity      Category = "activity"
	CategorySouvenir      Category = "souvenir"
	CategoryShopping      Category = "shopping"
	CategoryOther         Category = "other"
)

func (c Category) Valid() bool {
	switch c {
	case CategoryAccommodation, CategoryTransport, CategoryFood, CategoryActivity, CategorySouvenir, CategoryShopping, CategoryOther:
		return true
	}
	return false
}

// Expense represents a single trip expense entry.
type Expense struct {
	ID              string    // Unique expense ID
	TripID          string    // Parent trip ID
	ActivityID      *string   // Optional link to an activity
	Title           string    // Human-readable description
	Amount          float64   // Original amount in source currency
	Currency        string    // Source currency code (e.g. "IDR")
	ConvertedAmount float64   // Amount converted to trip base currency
	BaseCurrency    string    // Trip's base currency
	Category        Category  // Expense category
	ExpenseDate     time.Time // Date of the expense (user-editable)
	Note            string    // Optional notes
	CreatedAt       time.Time // Record creation timestamp
	UpdatedAt       time.Time // Last update timestamp
}

// Summary represents aggregated expense data for a trip.
type Summary struct {
	TotalBase    float64         // Total spent in base currency
	BaseCurrency string          // Base currency code
	ByCategory   []CategoryTotal // Breakdown by category
}

// CategoryTotal holds the total amount spent in a specific category.
type CategoryTotal struct {
	Category Category // Expense category
	Total    float64  // Total amount in base currency
}
