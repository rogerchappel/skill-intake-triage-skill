import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertRequiredPackageFiles } from './package-contents.js';

const output = execFileSync('npm', ['pack', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit']
});
const [manifest] = JSON.parse(output);

if (!manifest?.files || !manifest.filename) {
  throw new Error('npm pack did not return a package file manifest and archive');
}

assertRequiredPackageFiles(manifest.files.map(({ path }) => `package/${path}`));
const tempDir = mkdtempSync(join(tmpdir(), 'skill-intake-package-'));
try {
  execFileSync('tar', ['-xzf', join(process.cwd(), manifest.filename), '-C', tempDir], { stdio: 'inherit' });
  const packageDir = join(tempDir, 'package');
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const exportPath = pkg.exports?.['./schemas/intake-fixture.v1.schema.json'];
  if (!exportPath) throw new Error('packed package does not declare the schema subpath export');
  const schemaUrl = new URL(exportPath, `${pathToFileURL(`${packageDir}/`).href}`);
  const schema = JSON.parse(readFileSync(schemaUrl, 'utf8'));
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error('packed schema export does not contain the expected JSON Schema');
  }
  console.log(`package contents and schema export ok (${manifest.files.length} files)`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
  rmSync(join(process.cwd(), manifest.filename), { force: true });
}
