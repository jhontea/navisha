# /be-add-migration

Create a new numbered SQL migration file for Navisha's backend.

**Usage**: `/be-add-migration <description>`

Example: `/be-add-migration create-trips-table`

## Steps

1. **Find the next migration number**: List files in `backend/migrations/` and pick the next sequential number (zero-padded to 3 digits, e.g. `003`).

2. **Create the file**: `backend/migrations/{number}_{description}.sql`

3. **Write the migration**:
   - Use `CREATE TABLE IF NOT EXISTS` for new tables
   - Always include `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Always include `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Add foreign keys with `ON DELETE CASCADE` where appropriate
   - Add indexes for columns used in WHERE/JOIN clauses
   - For JSONB columns (e.g. activity `payload`): no index needed unless queried inside JSON

4. **Common patterns**:
   ```sql
   -- UUID primary key
   id UUID PRIMARY KEY DEFAULT gen_random_uuid()

   -- Foreign key
   trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE

   -- JSONB column
   payload JSONB NOT NULL DEFAULT '{}'

   -- Enum-style text with constraint
   type TEXT NOT NULL CHECK (type IN ('location', 'note', 'todo'))

   -- Timestamps
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   ```

 5. **Reference**: Check `backend/CLAUDE.md` for the entity model to ensure schema consistency.
