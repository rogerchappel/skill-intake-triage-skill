import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = new URL('../bin/skill-intake-triage-skill.js', import.meta.url);
const usage = 'Usage: skill-intake-triage-skill --fixture <file>\n';

function run(args) {
  return spawnSync(process.execPath, [cli.pathname, ...args], { encoding: 'utf8' });
}

test('preserves the documented CLI invocation', () => {
  const fixture = new URL('../fixtures/intake-request.json', import.meta.url);
  const result = run(['--fixture', fixture.pathname]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Skill Intake Triage\n/);
  assert.equal(result.stderr, '');
});

test('reports long-form prohibitions as local-only constraints', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skill-intake-cli-'));
  const fixture = join(directory, 'prohibition.json');
  await writeFile(fixture, JSON.stringify({
    request: 'do not under any circumstances publish the report',
    catalog: []
  }));
  const result = run(['--fixture', fixture]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Action: proceed-without-skill/);
  assert.match(result.stdout, /Safety notes:\n- none/);
});

test('gates an affirmative CLI action after a prohibited clause', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skill-intake-cli-'));
  const fixture = join(directory, 'mixed-actions.json');
  await writeFile(fixture, JSON.stringify({
    request: 'do not publish, however send the report',
    catalog: []
  }));
  const result = run(['--fixture', fixture]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Action: decline-or-ask-approval/);
  assert.match(result.stdout, /Request mentions an external or durable action/);
});

test('rejects missing, unknown, duplicate, and unexpected arguments', () => {
  for (const args of [
    [],
    ['--unknown'],
    ['--fixture'],
    ['--fixture', '--unknown'],
    ['--fixture', 'one.json', '--fixture', 'two.json'],
    ['--fixture', 'one.json', 'extra']
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '', args.join(' '));
    assert.equal(result.stderr, usage, args.join(' '));
  }
});

test('reports unreadable and malformed fixtures without a stack trace', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skill-intake-cli-'));
  const malformed = join(directory, 'malformed.json');
  await writeFile(malformed, '{invalid');

  const cases = [
    [join(directory, 'missing.json'), /^Error: cannot read fixture: /],
    [malformed, /^Error: fixture is not valid JSON\n$/]
  ];
  for (const [fixture, message] of cases) {
    const result = run(['--fixture', fixture]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stderr, /\n\s+at\s/);
  }
});

test('reports invalid fixture shapes separately from read failures', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skill-intake-cli-'));
  const cases = [
    ['null.json', null, 'Error: invalid fixture: expected an object\n'],
    ['null-entry.json', { request: 'make a post', catalog: [null] }, 'Error: invalid fixture: catalog[0] must be an object\n'],
    ['triggers.json', { request: 'make a post', catalog: [{ name: 'writer', triggers: 42 }] }, 'Error: invalid fixture: catalog[0].triggers must be an array of strings\n']
  ];
  for (const [name, fixture, message] of cases) {
    const path = join(directory, name);
    await writeFile(path, JSON.stringify(fixture));
    const result = run(['--fixture', path]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, message);
    assert.doesNotMatch(result.stderr, /TypeError|Cannot read|is not iterable|\n\s+at\s/);
  }
});
