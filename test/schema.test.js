import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const schema = JSON.parse(await readFile(new URL('../schemas/intake-fixture.v1.schema.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);

test('versioned schema is published through the package export', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.exports['./schemas/intake-fixture.v1.schema.json'], './schemas/intake-fixture.v1.schema.json');
  assert.equal(schema['$schema'], 'https://json-schema.org/draft/2020-12/schema');
});

test('schema describes valid fixture properties and extensible objects', () => {
  assert.deepEqual(schema.required, ['request', 'catalog']);
  assert.equal(schema.properties.request.type, 'string');
  assert.equal(schema.properties.catalog.items.properties.name.pattern, '\\S');
  assert.equal(schema.additionalProperties, true);
  assert.equal(schema.properties.catalog.items.additionalProperties, true);
  assert.ok(schema.properties.catalog.items.properties.sideEffects.oneOf.length === 2);
});
