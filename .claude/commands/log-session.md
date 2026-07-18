# /log-session

Add a new session entry to WORKLOG.md at the end of a work session.

**Usage**: `/log-session`

Run this at the **end of each work session** to record what was done.

## Steps

1. **Read** `WORKLOG.md` to understand the existing format, last session, and TOC structure.

2. **Summarize the current session**:
   - What was completed (files created/modified/deleted, features implemented, bugs fixed)
   - Key decisions made and why (trade-offs, alternatives considered)
   - Verification steps (build, test, lint commands and results)

3. **Check pending items**: Read the previous session's "Pending" list — move completed items to "Completed", keep remaining ones. Add new pending items.

4. **Write the new session entry** at the top of the sessions list (most recent first) using this format:

```markdown
## YYYY-MM-DD — [Short Title]

**Status**: [One sentence summary of what was achieved]

### Completed
- **Feature / fix name** — description
  - File-specific bullet points
- ...

### Key Decisions
- **Decision title** — rationale (why, trade-offs, alternatives considered)
- ...

### Verification
- `go build ./...` + `go test ./...` — PASS
- `npm run lint` — clean
- `npm run build` — success

### Files
- `path/to/changed/file.tsx`
- `path/to/new/file.go` (new)
- `path/to/deleted/` (deleted)

### Pending
- [ ] Item carried from previous session
- [ ] New pending item

### Resume From
[Specific next action — be actionable, not vague]
```

5. **Update the Sessions TOC** at the top of WORKLOG.md — add a new row to the table in chronological order (newest at top).

 6. **Update WORKLOG.md** with any feature milestones completed.
