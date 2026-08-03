import test from 'node:test';
import assert from 'node:assert/strict';
import { triageSkillIntake } from '../src/index.js';
const catalog = [{ name: 'repo-to-content-skill', triggers: ['repo','launch','post'], requiredInputs: ['README.md'] }];
test('selects a matching skill when inputs are present', () => {
  const result = triageSkillIntake({ request: 'make a repo launch post from README.md', catalog });
  assert.equal(result.action, 'use-skill');
  assert.equal(result.selectedSkill, 'repo-to-content-skill');
});
test('asks for missing required inputs', () => {
  const result = triageSkillIntake({ request: 'make a repo launch post', catalog });
  assert.equal(result.action, 'ask-for-input');
  assert.deepEqual(result.missingInputs, ['README.md']);
});
test('flags side-effect language', () => {
  const result = triageSkillIntake({ request: 'publish the launch post from README.md', catalog });
  assert.equal(result.action, 'decline-or-ask-approval');
});
test('does not flag an explicitly negated external action', () => {
  for (const request of [
    'draft the launch post from README.md, but do not publish it',
    "draft the launch post from README.md; don't send it",
    'prepare the launch post from README.md without publishing it',
    'prepare the launch post from README.md and never publish it'
  ]) {
    const result = triageSkillIntake({ request, catalog });
    assert.equal(result.action, 'use-skill');
    assert.deepEqual(result.safetyNotes, []);
  }
});
test('still flags an affirmative action alongside a negated action', () => {
  const result = triageSkillIntake({
    request: 'do not publish the launch post; send it from README.md',
    catalog
  });
  assert.equal(result.action, 'decline-or-ask-approval');
});
test('gates a matching skill that declares side effects', () => {
  const result = triageSkillIntake({
    request: 'prepare release notes',
    catalog: [{ name: 'publisher', triggers: ['release'], requiredInputs: [], sideEffects: 'Publishing requires approval' }]
  });
  assert.equal(result.action, 'decline-or-ask-approval');
  assert.equal(result.selectedSkill, 'publisher');
  assert.deepEqual(result.safetyNotes, ['Publishing requires approval']);
});
test('uses a matching skill without declared side effects', () => {
  const result = triageSkillIntake({
    request: 'prepare release notes',
    catalog: [{ name: 'release-notes', triggers: ['release'], requiredInputs: [] }]
  });
  assert.equal(result.action, 'use-skill');
  assert.equal(result.selectedSkill, 'release-notes');
});
test('allows no-skill path for unrelated requests', () => {
  const result = triageSkillIntake({ request: 'summarize lunch options', catalog });
  assert.equal(result.action, 'proceed-without-skill');
});
test('does not match triggers embedded at the start or end of another word', () => {
  for (const request of ['postpone lunch', 'review the compost']) {
    const result = triageSkillIntake({
      request,
      catalog: [{ name: 'social-writer', triggers: ['post'], requiredInputs: [] }]
    });
    assert.equal(result.action, 'proceed-without-skill');
    assert.equal(result.selectedSkill, null);
    assert.equal(result.score, 0);
  }
});
test('matches a trigger as a standalone word', () => {
  const result = triageSkillIntake({
    request: 'make a repo launch post',
    catalog: [{ name: 'social-writer', triggers: ['post'], requiredInputs: [] }]
  });
  assert.equal(result.action, 'use-skill');
  assert.equal(result.selectedSkill, 'social-writer');
  assert.deepEqual(result.candidates[0].reasons, ['post']);
});
