import { execFileSync } from 'node:child_process';
import { assertRequiredPackageFiles } from './package-contents.js';

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit']
});
const [manifest] = JSON.parse(output);

if (!manifest?.files) {
  throw new Error('npm pack did not return a package file manifest');
}

assertRequiredPackageFiles(manifest.files.map(({ path }) => `package/${path}`));
console.log(`package contents ok (${manifest.files.length} files)`);
