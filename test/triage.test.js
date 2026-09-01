import test from 'node:test';
import assert from 'node:assert/strict';
import { InvalidFixtureError, formatTriageReport, triageSkillIntake } from '../src/index.js';
const catalog = [{ name: 'repo-to-content-skill', triggers: ['repo','launch','post'], requiredInputs: ['README.md'] }];
test('rejects invalid fixture shapes with deterministic diagnostics', () => {
  const cases = [
    [null, 'invalid fixture: expected an object'],
    [{ request: 42, catalog: [] }, 'invalid fixture: request must be a string'],
    [{ request: 'make a post', catalog: null }, 'invalid fixture: catalog must be an array'],
    [{ request: 'make a post', catalog: [null] }, 'invalid fixture: catalog[0] must be an object'],
    [{ request: 'make a post', catalog: [{}] }, 'invalid fixture: catalog[0].name must be a non-empty string'],
    [{ request: 'make a post', catalog: [{ name: 'writer', triggers: 42 }] }, 'invalid fixture: catalog[0].triggers must be an array of strings']
  ];
  for (const [fixture, message] of cases) {
    assert.throws(() => triageSkillIntake(fixture), (error) => {
      assert.ok(error instanceof InvalidFixtureError);
      assert.equal(error.message, message);
      return true;
    });
  }
});
test('rejects blank catalog array entries with deterministic field paths', () => {
  for (const field of ['triggers', 'requiredInputs', 'sideEffects']) {
    for (const value of ['', '   ']) {
      const fixture = { request: 'use writer', catalog: [{ name: 'writer', [field]: ['valid', value] }] };
      assert.throws(() => triageSkillIntake(fixture), (error) => {
        assert.ok(error instanceof InvalidFixtureError);
        assert.equal(error.message, `invalid fixture: catalog[0].${field}[1] must be a non-empty string`);
        return true;
      });
    }
  }
});
test('accepts omitted and empty optional catalog arrays', () => {
  for (const fields of [{}, { triggers: [], requiredInputs: [], sideEffects: [] }]) {
    const result = triageSkillIntake({ request: 'use writer', catalog: [{ name: 'writer', ...fields }] });
    assert.equal(result.action, 'use-skill');
    assert.equal(result.selectedSkill, 'writer');
  }
});
test('preserves valid fixtures with omitted optional catalog fields', () => {
  const result = triageSkillIntake({ request: 'use writer', catalog: [{ name: 'writer' }] });
  assert.equal(result.action, 'use-skill');
  assert.equal(result.selectedSkill, 'writer');
});
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
test('does not satisfy a required input with a larger filename', () => {
  const result = triageSkillIntake({ request: 'make a repo launch post from NOTREADME.md', catalog });
  assert.equal(result.action, 'ask-for-input');
  assert.deepEqual(result.missingInputs, ['README.md']);
});
test('recognizes documented required inputs next to punctuation', () => {
  for (const request of ['use README.md, please', 'use (README.md)']) {
    const result = triageSkillIntake({ request: `make a repo launch post; ${request}`, catalog });
    assert.equal(result.action, 'use-skill', request);
    assert.deepEqual(result.missingInputs, [], request);
  }
});
test('flags side-effect language', () => {
  const result = triageSkillIntake({ request: 'publish the launch post from README.md', catalog });
  assert.equal(result.action, 'decline-or-ask-approval');
});
test('flags affirmative inflections of every durable action', () => {
  const affirmativeForms = {
    apply: ['apply', 'applies', 'applied', 'applying'],
    approve: ['approve', 'approves', 'approved', 'approving'],
    install: ['install', 'installs', 'installed', 'installing'],
    publish: ['publish', 'publishes', 'published', 'publishing'],
    send: ['send', 'sends', 'sent', 'sending'],
    delete: ['delete', 'deletes', 'deleted', 'deleting'],
    charge: ['charge', 'charges', 'charged', 'charging'],
    merge: ['merge', 'merges', 'merged', 'merging']
  };

  for (const [action, forms] of Object.entries(affirmativeForms)) {
    for (const form of forms) {
      const result = triageSkillIntake({ request: `the automation is ${form} the release`, catalog: [] });
      assert.equal(result.action, 'decline-or-ask-approval', `${action}: ${form}`);
      assert.deepEqual(result.safetyNotes, [
        'Request mentions an external or durable action; require explicit approval before side effects.'
      ], `${action}: ${form}`);
    }
  }
});
test('allows explicitly negated inflections of every durable action', () => {
  for (const form of ['applying', 'approved', 'installs', 'published', 'sending', 'deleted', 'charges', 'merges']) {
    const result = triageSkillIntake({ request: `prepare the release without ${form} it`, catalog: [] });
    assert.equal(result.action, 'proceed-without-skill', form);
    assert.deepEqual(result.safetyNotes, [], form);
  }
});
test('does not treat durable action text inside a larger word as an action', () => {
  for (const request of ['the applicant is ready', 'approval is pending', 'the sender replied', 'mergeable result']) {
    const result = triageSkillIntake({ request, catalog: [] });
    assert.equal(result.action, 'proceed-without-skill', request);
    assert.deepEqual(result.safetyNotes, [], request);
  }
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
test('allows explicit prohibitions with intervening modifier phrases', () => {
  for (const request of [
    'do not under any circumstances publish the report',
    'never automatically send the draft to subscribers',
    'prepare the report without first publicly publishing it'
  ]) {
    const result = triageSkillIntake({ request, catalog: [] });
    assert.equal(result.action, 'proceed-without-skill', request);
    assert.deepEqual(result.safetyNotes, [], request);
  }
});
test('still gates a separate affirmative action after a long prohibition', () => {
  const result = triageSkillIntake({
    request: 'do not under any circumstances publish the report; send it to the editor',
    catalog: []
  });
  assert.equal(result.action, 'decline-or-ask-approval');
  assert.equal(result.safetyNotes.length, 1);
});
test('still flags an affirmative action alongside a negated action', () => {
  const result = triageSkillIntake({
    request: 'do not publish the launch post; send it from README.md',
    catalog
  });
  assert.equal(result.action, 'decline-or-ask-approval');
});
test('still flags an affirmative inflection alongside a negated inflection', () => {
  const result = triageSkillIntake({
    request: 'do not publish the draft; the automation is sending it',
    catalog: []
  });
  assert.equal(result.action, 'decline-or-ask-approval');
  assert.equal(result.safetyNotes.length, 1);
});
test('scopes prohibitions before independent affirmative clauses', () => {
  const cases = [
    'do not publish but send the report',
    'do not publish, however send the report',
    'do not publish; then send the report',
    'do not publish. Send the report',
    'do not publish and merge the approved change',
    'never automatically sending the draft, but publishes the report'
  ];
  for (const request of cases) {
    const result = triageSkillIntake({ request, catalog: [] });
    assert.equal(result.action, 'decline-or-ask-approval', request);
    assert.deepEqual(result.safetyNotes, [
      'Request mentions an external or durable action; require explicit approval before side effects.'
    ], request);
  }
});
test('keeps genuinely shared prohibitions local-only', () => {
  for (const request of [
    'do not publish or send the report',
    "don't delete or merge the change",
    'never automatically publish or publicly send the report',
    'prepare the report without publishing or sending it'
  ]) {
    const result = triageSkillIntake({ request, catalog: [] });
    assert.equal(result.action, 'proceed-without-skill', request);
    assert.deepEqual(result.safetyNotes, [], request);
  }
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
test('ignores empty side-effect declarations', () => {
  for (const sideEffects of ['', []]) {
    const result = triageSkillIntake({
      request: 'prepare release notes',
      catalog: [{ name: 'release-notes', triggers: ['release'], requiredInputs: [], sideEffects }]
    });
    assert.equal(result.action, 'use-skill');
    assert.deepEqual(result.safetyNotes, []);
    assert.match(formatTriageReport(result), /Safety notes:\n- none$/);
  }
});
test('emits one safety note for each declared side effect', () => {
  const result = triageSkillIntake({
    request: 'prepare release notes',
    catalog: [{
      name: 'publisher',
      triggers: ['release'],
      requiredInputs: [],
      sideEffects: ['Publish the release', 'Notify subscribers']
    }]
  });
  assert.equal(result.action, 'decline-or-ask-approval');
  assert.deepEqual(result.safetyNotes, ['Publish the release', 'Notify subscribers']);
  assert.match(formatTriageReport(result), /Safety notes:\n- Publish the release\n- Notify subscribers$/);
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
test('does not select a skill from generic description words', () => {
  const cases = [
    {
      request: 'summarize the quarterly report',
      skill: { name: 'image-generator', description: 'Create the best image assets' }
    },
    {
      request: 'review project status',
      skill: { name: 'emailer', description: 'Send project updates' }
    }
  ];

  for (const { request, skill } of cases) {
    const result = triageSkillIntake({ request, catalog: [skill] });
    assert.equal(result.action, 'proceed-without-skill', request);
    assert.equal(result.selectedSkill, null, request);
    assert.equal(result.score, 0, request);
  }
});
test('matches a distinctive phrase derived from a description', () => {
  const result = triageSkillIntake({
    request: 'generate polished image assets for the campaign',
    catalog: [{ name: 'visual-maker', description: 'Create the best image assets' }]
  });
  assert.equal(result.action, 'use-skill');
  assert.equal(result.selectedSkill, 'visual-maker');
  assert.deepEqual(result.candidates[0].reasons, ['image assets']);
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
