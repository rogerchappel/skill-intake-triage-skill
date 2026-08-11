export const requiredPackageFiles = [
  'package/SKILL.md',
  'package/README.md',
  'package/LICENSE',
  'package/package.json',
  'package/bin/skill-intake-triage-skill.js',
  'package/src/index.js'
];

export function assertRequiredPackageFiles(files, required = requiredPackageFiles) {
  const published = new Set(files);
  const missing = required.filter((file) => !published.has(file));

  if (missing.length > 0) {
    throw new Error(`package is missing required files: ${missing.join(', ')}`);
  }
}
