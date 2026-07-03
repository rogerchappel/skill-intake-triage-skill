#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { triageSkillIntake, formatTriageReport } from '../src/index.js';
const idx = process.argv.indexOf('--fixture');
if (idx === -1 || !process.argv[idx + 1]) { console.error('Usage: skill-intake-triage-skill --fixture <file>'); process.exit(2); }
const input = JSON.parse(readFileSync(process.argv[idx + 1], 'utf8'));
console.log(formatTriageReport(triageSkillIntake(input)));
