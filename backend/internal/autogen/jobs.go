package autogen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Async trip generation. A job outlives the request that started it so the
// user can leave the page and come back; state lives in Redis (no migration).
const (
	jobKeyPrefix    = "autogen:job:"
	activeKeyPrefix = "autogen:active:"
	lastKeyPrefix   = "autogen:last:"

	// jobTTL is how long a finished (or abandoned) job stays readable.
	jobTTL = time.Hour
	// activeTTL caps how long one user can be blocked by a job that never
	// cleared its active key (crash); a little over the 300s LLM timeout.
	activeTTL = 360 * time.Second
	// staleAfter: a job still "running" this long after it started died with a
	// backend restart; GET reports it failed.
	staleAfter = 6 * time.Minute
)

type JobStatus string

const (
	JobRunning JobStatus = "running"
	JobDone    JobStatus = "done"
	JobFailed  JobStatus = "failed"
)

// ErrJobNotFound: no such job, expired, or owned by someone else.
var ErrJobNotFound = errors.New("job not found")

// JobError is the user-safe reason a job failed (same codes as mapErr).
type JobError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Job struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	Status    JobStatus  `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	StartDate string     `json:"start_date"`
	EndDate   string     `json:"end_date"`
	Draft     *TripDraft `json:"draft,omitempty"`
	Error     *JobError  `json:"error,omitempty"`
}

// JobStore keeps jobs and the per-user "one job at a time" lock.
type JobStore interface {
	// TryAcquire takes the user's active slot for jobID. When someone holds it,
	// ok is false and existing is the holder's job id.
	TryAcquire(ctx context.Context, userID, jobID string) (existing string, ok bool, err error)
	// Release frees the slot only if jobID still holds it.
	Release(ctx context.Context, userID, jobID string) error
	Save(ctx context.Context, j Job) error
	Get(ctx context.Context, jobID string) (*Job, error)
	// SetLast remembers the user's most recent job for coming back to the page.
	SetLast(ctx context.Context, userID, jobID string) error
	// CurrentJobID is the user's active job, else the most recent one;
	// ErrJobNotFound when there is none.
	CurrentJobID(ctx context.Context, userID string) (string, error)
}

type redisJobStore struct{ rdb *redis.Client }

func NewJobStore(rdb *redis.Client) JobStore { return &redisJobStore{rdb: rdb} }

// Compare-and-delete: a finished job must not free the slot of a newer one.
var releaseScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
end
return 0`)

func (s *redisJobStore) TryAcquire(ctx context.Context, userID, jobID string) (string, bool, error) {
	key := activeKeyPrefix + userID
	// The holder can expire between SETNX and GET; one retry settles that.
	for range 2 {
		ok, err := s.rdb.SetNX(ctx, key, jobID, activeTTL).Result()
		if err != nil {
			return "", false, fmt.Errorf("autogen.jobs.TryAcquire: %w", err)
		}
		if ok {
			return "", true, nil
		}
		existing, err := s.rdb.Get(ctx, key).Result()
		if errors.Is(err, redis.Nil) {
			continue
		}
		if err != nil {
			return "", false, fmt.Errorf("autogen.jobs.TryAcquire: %w", err)
		}
		return existing, false, nil
	}
	return "", false, fmt.Errorf("autogen.jobs.TryAcquire: slot kept changing")
}

func (s *redisJobStore) Release(ctx context.Context, userID, jobID string) error {
	if err := releaseScript.Run(ctx, s.rdb, []string{activeKeyPrefix + userID}, jobID).Err(); err != nil {
		return fmt.Errorf("autogen.jobs.Release: %w", err)
	}
	return nil
}

func (s *redisJobStore) Save(ctx context.Context, j Job) error {
	b, err := json.Marshal(j)
	if err != nil {
		return fmt.Errorf("autogen.jobs.Save: %w", err)
	}
	if err := s.rdb.Set(ctx, jobKeyPrefix+j.ID, b, jobTTL).Err(); err != nil {
		return fmt.Errorf("autogen.jobs.Save: %w", err)
	}
	return nil
}

func (s *redisJobStore) Get(ctx context.Context, jobID string) (*Job, error) {
	b, err := s.rdb.Get(ctx, jobKeyPrefix+jobID).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrJobNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("autogen.jobs.Get: %w", err)
	}
	var j Job
	if err := json.Unmarshal(b, &j); err != nil {
		return nil, fmt.Errorf("autogen.jobs.Get: %w", err)
	}
	return &j, nil
}

func (s *redisJobStore) SetLast(ctx context.Context, userID, jobID string) error {
	if err := s.rdb.Set(ctx, lastKeyPrefix+userID, jobID, jobTTL).Err(); err != nil {
		return fmt.Errorf("autogen.jobs.SetLast: %w", err)
	}
	return nil
}

func (s *redisJobStore) CurrentJobID(ctx context.Context, userID string) (string, error) {
	for _, key := range []string{activeKeyPrefix + userID, lastKeyPrefix + userID} {
		id, err := s.rdb.Get(ctx, key).Result()
		if errors.Is(err, redis.Nil) {
			continue
		}
		if err != nil {
			return "", fmt.Errorf("autogen.jobs.CurrentJobID: %w", err)
		}
		return id, nil
	}
	return "", ErrJobNotFound
}
