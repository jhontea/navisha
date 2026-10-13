// Package dbtx runs a function inside a database transaction.
package dbtx

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// Beginner is the transaction control every repository that needs
// multi-statement writes already exposes (BeginTx / Commit / Rollback).
type Beginner interface {
	BeginTx(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context, tx pgx.Tx) error
	Rollback(ctx context.Context, tx pgx.Tx) error
}

// WithTx begins a transaction, runs fn, and commits when fn returns nil.
// It rolls back when fn returns an error or panics (the panic is re-raised),
// so callers cannot forget either step.
func WithTx(ctx context.Context, db Beginner, fn func(tx pgx.Tx) error) (err error) {
	tx, err := db.BeginTx(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = db.Rollback(ctx, tx)
			panic(p)
		}
		if err != nil {
			_ = db.Rollback(ctx, tx)
		}
	}()
	if err = fn(tx); err != nil {
		return err
	}
	return db.Commit(ctx, tx)
}
