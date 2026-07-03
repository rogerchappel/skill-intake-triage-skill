# skill-intake-triage-skill

Use this skill when an agent has a freeform user request and a catalog of available skills, but needs a quick routing decision before invoking any skill. It requires only local JSON input. It never installs, applies, approves, or runs skills. External actions require explicit approval outside this tool. Validate with npm test, npm run check, and npm run smoke.

## Examples

```sh
npm run smoke
```

## Verification

Run `npm test`, `npm run check`, `npm run build`, and `npm run smoke` before trusting the package in another workflow.
