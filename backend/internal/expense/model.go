package expense

import "time"

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

type Expense struct {
	ID              string
	TripID          string
	ActivityID      *string // nullable: expense may or may not link to an activity
	Title           string
	Amount          float64
	Currency        string
	ConvertedAmount float64
	BaseCurrency    string
	Category        Category
	ExpenseDate     time.Time // date of the expense (YYYY-MM-DD), user-editable
	Note            string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Summary struct {
	TotalBase    float64
	BaseCurrency string
	ByCategory   []CategoryTotal
}

type CategoryTotal struct {
	Category Category
	Total    float64
}
