# Orchestration

Run this before invoking a reusable skill. Feed it a catalog and request, review the report, then either ask the user for missing inputs or proceed with the chosen skill.

## Suggested Flow

1. Collect local input fixtures.
2. Run `npm run smoke`.
3. Review the report before any separate side-effecting tool runs.
4. Record verification output in the release-candidate PR.
