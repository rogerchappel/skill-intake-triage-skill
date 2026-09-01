# skill-intake-triage-skill

Local-first intake triage for choosing reusable agent skills safely.

## Quickstart

```sh
npm test
npm run check
npm run smoke
```

## CLI

```sh
node bin/skill-intake-triage-skill.js --fixture fixtures/intake-request.json
```

The CLI accepts exactly one `--fixture <file>` argument. Argument errors print the
usage line and exit with status 2. Unreadable files, malformed JSON, and valid
JSON that does not match the fixture schema print distinct, concise errors
without a stack trace and exit with status 1. Successful triage
prints the report and exits with status 0.

## Library

Import from `src/index.js` or package exports once installed. The API is local-first and deterministic for fixture-driven review.

### Fixture schema

A fixture is a JSON object with a string `request` and an array `catalog`.
Every catalog entry is an object with a non-empty string `name`. Optional fields
are `description` (string), `triggers` and `requiredInputs` (arrays of non-empty
strings), and `sideEffects` (a string or an array of non-empty strings). The
three array fields may be omitted or set to `[]`; blank or whitespace-only array
entries are invalid. Unknown fields are ignored.
The library throws `InvalidFixtureError` with the first invalid field path when
this schema is not met; the CLI prints the same deterministic diagnostic.

Catalog entries may declare `sideEffects` as either one non-empty string or an array of non-empty strings. Each string becomes a separate safety note and gates use of the selected skill pending approval. Omit `sideEffects`, or use `""` or `[]`, for skills with no declared side effects. See `fixtures/intake-request.json` for an executable catalog example.

Required inputs use boundary-aware, case-insensitive matching: `README.md` is
recognized as an exact input next to ordinary punctuation, while
`NOTREADME.md` does not satisfy it.

### Skill matching

Skill selection is boundary-aware and case-insensitive. An exact skill name or
any declared trigger can select a catalog entry. Descriptions provide fallback
matching only through two-word phrases formed from their meaningful words;
individual description words do not count. For example, `image assets` can
match a description containing that phrase, while shared prose such as `the`
or an incidental noun such as `project` cannot select a skill by itself.

## Limitations

This project is a release-candidate MVP. It expects JSON input and does not call external services.

## Safety Notes

The tool is read-only. Treat any external write, publish, approval, install, or connector execution as outside this package and subject to explicit user approval.

Action gating is conservative: affirmative requests to apply, approve, install, publish, send, delete, charge, or merge are gated, including grammatical forms such as `publishing`, `sent`, `deleted`, and `merges`. Matching skills that declare side effects are also gated. An explicit prohibition such as `do not publish`, `never automatically send`, or `without first publicly publishing` is treated as a local-only constraint, even when ordinary modifier words appear before the action. A shared prohibition such as `do not publish or send` keeps both actions local-only. A separate affirmative clause after punctuation, `but`, `however`, `then`, or `and` remains gated, including inflected forms; for example, `do not publish, however send the report` requires approval.

## Release Candidate

See `docs/RELEASE_CANDIDATE.md` and `docs/RELEASE_CHECKLIST.md` for the current readiness notes.

## Local Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

`npm run package:smoke` inspects the `npm pack` manifest and fails when a
required published artifact, including `SKILL.md`, is missing.

## Verification

```sh
npm test
npm run check --if-present
npm run smoke --if-present
```
