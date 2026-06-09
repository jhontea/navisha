# /log-session

Add a new session entry to WORKLOG.md at the end of a work session.

**Usage**: `/log-session`

Run this at the **end of each work session** to record what was done.

## Steps

1. **Read** `WORKLOG.md` to understand the existing format and last session.

2. **Summarize the current session**:
   - What was completed (files created, features implemented, bugs fixed)
   - Key decisions made and why
   - Any blockers or open questions

3. **Check pending items**: Read the previous session's "Pending" list — move completed items to "Completed", keep remaining ones.

4. **Write the new session entry** at the top of the sessions list (most recent first) using this format:

```markdown
## YYYY-MM-DD — Session N: [Short Title]

**Status**: [One sentence on current state]

### Completed
- ...

### Key Decisions
- ...

### Pending
- [ ] ...

### Resume From
[Exactly where to start next session — be specific]
```

5. **Update README.md roadmap checkboxes** if any major milestones were completed.
