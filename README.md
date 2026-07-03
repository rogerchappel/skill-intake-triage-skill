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

## Library

Import from `src/index.js` or package exports once installed. The API is local-first and deterministic for fixture-driven review.

## Limitations

This project is a release-candidate MVP. It expects JSON input and does not call external services.

## Safety Notes

The tool is read-only. Treat any external write, publish, approval, install, or connector execution as outside this package and subject to explicit user approval.
