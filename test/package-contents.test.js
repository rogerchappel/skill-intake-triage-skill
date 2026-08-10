import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRequiredPackageFiles,
  requiredPackageFiles
} from '../scripts/package-contents.js';

test('accepts a package containing every required published artifact', () => {
  assert.doesNotThrow(() => assertRequiredPackageFiles(requiredPackageFiles));
});

test('reports every missing required published artifact', () => {
  const files = requiredPackageFiles.filter(
    (file) => file !== 'package/SKILL.md' && file !== 'package/LICENSE'
  );

  assert.throws(
    () => assertRequiredPackageFiles(files),
    /package is missing required files: package\/SKILL\.md, package\/LICENSE/
  );
});
