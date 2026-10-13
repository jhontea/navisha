package dbtx

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
)

type fakeDB struct {
	beginErr, commitErr   error
	committed, rolledBack bool
}

func (f *fakeDB) BeginTx(context.Context) (pgx.Tx, error) { return nil, f.beginErr }
func (f *fakeDB) Commit(context.Context, pgx.Tx) error {
	f.committed = true
	return f.commitErr
}
func (f *fakeDB) Rollback(context.Context, pgx.Tx) error {
	f.rolledBack = true
	return nil
}

func TestWithTx(t *testing.T) {
	ctx := context.Background()
	boom := errors.New("boom")

	t.Run("commits on success", func(t *testing.T) {
		db := &fakeDB{}
		if err := WithTx(ctx, db, func(pgx.Tx) error { return nil }); err != nil {
			t.Fatal(err)
		}
		if !db.committed || db.rolledBack {
			t.Fatalf("committed=%v rolledBack=%v", db.committed, db.rolledBack)
		}
	})

	t.Run("rolls back on error", func(t *testing.T) {
		db := &fakeDB{}
		if err := WithTx(ctx, db, func(pgx.Tx) error { return boom }); !errors.Is(err, boom) {
			t.Fatalf("err = %v", err)
		}
		if db.committed || !db.rolledBack {
			t.Fatalf("committed=%v rolledBack=%v", db.committed, db.rolledBack)
		}
	})

	t.Run("rolls back when commit fails", func(t *testing.T) {
		db := &fakeDB{commitErr: boom}
		if err := WithTx(ctx, db, func(pgx.Tx) error { return nil }); !errors.Is(err, boom) {
			t.Fatalf("err = %v", err)
		}
		if !db.rolledBack {
			t.Fatal("expected rollback after a failed commit")
		}
	})

	t.Run("does not run fn when begin fails", func(t *testing.T) {
		db := &fakeDB{beginErr: boom}
		ran := false
		if err := WithTx(ctx, db, func(pgx.Tx) error { ran = true; return nil }); !errors.Is(err, boom) || ran {
			t.Fatalf("err=%v ran=%v", err, ran)
		}
	})

	t.Run("rolls back and re-panics", func(t *testing.T) {
		db := &fakeDB{}
		defer func() {
			if recover() == nil {
				t.Fatal("expected the panic to propagate")
			}
			if !db.rolledBack || db.committed {
				t.Fatalf("committed=%v rolledBack=%v", db.committed, db.rolledBack)
			}
		}()
		_ = WithTx(ctx, db, func(pgx.Tx) error { panic("bad") })
	})
}
