import { accessSync, readFileSync } from 'node:fs';
const required = ['README.md','SKILL.md','docs/PRD.md','docs/TASKS.md','docs/ORCHESTRATION.md','package.json','src/index.js','test/triage.test.js'];
for (const file of required) accessSync(file);
const pkg = JSON.parse(readFileSync('package.json','utf8'));
if (!pkg.bin || !pkg.exports) throw new Error('package metadata missing bin or exports');
console.log('check ok');
