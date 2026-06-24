package calendarexport

// Repository persists the entity↔Google-event mappings.
type Repository interface {
	Insert(e *Export) error
	ListByTrip(tripID string) ([]Export, error)
	DeleteByTrip(tripID string) error
	DeleteByID(id string) error
	ExistsBySource(sourceType, sourceID string) (bool, error)
	CountByTrip(tripID string) (int, error)
}
