#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { InvalidFixtureError, triageSkillIntake, formatTriageReport } from '../src/index.js';

const usage = 'Usage: skill-intake-triage-skill --fixture <file>';
const args = process.argv.slice(2);

if (args.length !== 2 || args[0] !== '--fixture' || !args[1] || args[1].startsWith('--')) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(readFileSync(args[1], 'utf8'));
    console.log(formatTriageReport(triageSkillIntake(input)));
  } catch (error) {
    const detail = error instanceof SyntaxError
      ? 'fixture is not valid JSON'
      : error instanceof InvalidFixtureError
        ? error.message
        : `cannot read fixture: ${error.message}`;
    console.error(`Error: ${detail}`);
    process.exitCode = 1;
  }
}
