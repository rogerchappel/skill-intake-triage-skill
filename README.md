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
usage line and exit with status 2. Unreadable or malformed JSON fixtures print a
concise error without a stack trace and exit with status 1. Successful triage
prints the report and exits with status 0.

## Library

Import from `src/index.js` or package exports once installed. The API is local-first and deterministic for fixture-driven review.

Catalog entries may declare `sideEffects` as either one non-empty string or an array of non-empty strings. Each string becomes a separate safety note and gates use of the selected skill pending approval. Omit `sideEffects`, or use `""` or `[]`, for skills with no declared side effects. See `fixtures/intake-request.json` for an executable catalog example.

Required inputs use boundary-aware, case-insensitive matching: `README.md` is
recognized as an exact input next to ordinary punctuation, while
`NOTREADME.md` does not satisfy it.

## Limitations

This project is a release-candidate MVP. It expects JSON input and does not call external services.

## Safety Notes

The tool is read-only. Treat any external write, publish, approval, install, or connector execution as outside this package and subject to explicit user approval.

Action gating is conservative: affirmative requests to apply, approve, install, publish, send, delete, charge, or merge are gated, including grammatical forms such as `publishing`, `sent`, `deleted`, and `merges`. Matching skills that declare side effects are also gated. An explicit prohibition such as `do not publish`, `never send`, or `without publishing` is treated as a local-only constraint, not as a request to perform that action. If the same request contains any other affirmative durable action, including an inflected form, it remains gated.

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
