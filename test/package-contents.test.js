import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRequiredPackageFiles,
  requiredPackageFiles
} from '../scripts/package-contents.js';

test('accepts a package containing every required published artifact', () => {
  assert.doesNotThrow(() => assertRequiredPackageFiles(requiredPackageFiles));
});

test('required published artifact paths are unique', () => {
  assert.equal(new Set(requiredPackageFiles).size, requiredPackageFiles.length);
});

test('reports omission of each required published artifact', () => {
  for (const missing of requiredPackageFiles) {
    const files = requiredPackageFiles.filter((file) => file !== missing);
    assert.throws(
      () => assertRequiredPackageFiles(files),
      new RegExp(`package is missing required files: ${missing.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`)
    );
  }
});
