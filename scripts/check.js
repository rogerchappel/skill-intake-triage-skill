import { accessSync, readFileSync } from 'node:fs';
const required = ['README.md','SKILL.md','docs/PRD.md','docs/TASKS.md','docs/ORCHESTRATION.md','package.json','src/index.js','test/triage.test.js','schemas/intake-fixture.v1.schema.json'];
for (const file of required) accessSync(file);
const pkg = JSON.parse(readFileSync('package.json','utf8'));
if (!pkg.bin || !pkg.exports) throw new Error('package metadata missing bin or exports');
if (pkg.exports['./schemas/intake-fixture.v1.schema.json'] !== './schemas/intake-fixture.v1.schema.json') throw new Error('package metadata missing versioned fixture schema export');
const fixtureSchema = JSON.parse(readFileSync('schemas/intake-fixture.v1.schema.json', 'utf8'));
if (fixtureSchema['$schema'] !== 'https://json-schema.org/draft/2020-12/schema') throw new Error('fixture schema draft is missing');
console.log('check ok');
