import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { triageSkillIntake } from '../src/index.js';

async function loadFixture(name) {
  const path = new URL(`../fixtures/${name}`, import.meta.url);
  return JSON.parse(await readFile(fileURLToPath(path), 'utf8'));
}

test('adopter request asks only for the missing project plan and respects no-publish constraint', async () => {
  const result = triageSkillIntake(await loadFixture('adopter-missing-input.json'));
  assert.equal(result.selectedSkill, 'repo-to-content-skill');
  assert.equal(result.action, 'ask-for-input');
  assert.deepEqual(result.missingInputs, ['README.md', 'docs/PRD.md']);
  assert.deepEqual(result.safetyNotes, []);
});

test('adopter request requiring an email is gated as a durable action', async () => {
  const result = triageSkillIntake(await loadFixture('adopter-side-effect.json'));
  assert.equal(result.selectedSkill, 'launch-announcement-skill');
  assert.equal(result.action, 'decline-or-ask-approval');
  assert.deepEqual(result.missingInputs, []);
  assert.equal(result.safetyNotes.length, 1);
});
