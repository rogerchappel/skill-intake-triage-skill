export class InvalidFixtureError extends TypeError {
  constructor(message) {
    super(`invalid fixture: ${message}`);
    this.name = 'InvalidFixtureError';
  }
}

export function triageSkillIntake(input) {
  validateFixture(input);
  const request = normalizeText(input.request ?? '');
  const catalog = input.catalog;
  const blocked = detectUnsafe(request);
  const candidates = catalog.map((skill) => scoreSkill(request, skill)).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const missingInputs = best ? requiredInputs(best.skill).filter((item) => !hasInput(request, item)) : [];
  const declaredSideEffects = normalizeSideEffects(best?.skill.sideEffects);
  const action = blocked.length ? 'decline-or-ask-approval' : !best ? 'proceed-without-skill' : missingInputs.length ? 'ask-for-input' : declaredSideEffects.length ? 'decline-or-ask-approval' : 'use-skill';
  return { action, selectedSkill: best?.skill.name ?? null, score: best?.score ?? 0, candidates: candidates.slice(0, 3).map(({skill, score, reasons}) => ({ name: skill.name, score, reasons })), missingInputs, safetyNotes: [...blocked, ...declaredSideEffects] };
}
function validateFixture(input) {
  if (!isObject(input)) throw new InvalidFixtureError('expected an object');
  if (typeof input.request !== 'string') throw new InvalidFixtureError('request must be a string');
  if (!Array.isArray(input.catalog)) throw new InvalidFixtureError('catalog must be an array');

  input.catalog.forEach((skill, index) => {
    const path = `catalog[${index}]`;
    if (!isObject(skill)) throw new InvalidFixtureError(`${path} must be an object`);
    if (typeof skill.name !== 'string' || !skill.name.trim()) throw new InvalidFixtureError(`${path}.name must be a non-empty string`);
    validateOptionalString(skill, 'description', path);
    validateOptionalStringArray(skill, 'triggers', path);
    validateOptionalStringArray(skill, 'requiredInputs', path);
    if (skill.sideEffects !== undefined && typeof skill.sideEffects !== 'string' && !isStringArray(skill.sideEffects)) {
      throw new InvalidFixtureError(`${path}.sideEffects must be a string or an array of strings`);
    }
  });
}
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isStringArray(value) { return Array.isArray(value) && value.every((item) => typeof item === 'string'); }
function validateOptionalString(object, field, path) {
  if (object[field] !== undefined && typeof object[field] !== 'string') throw new InvalidFixtureError(`${path}.${field} must be a string`);
}
function validateOptionalStringArray(object, field, path) {
  if (object[field] !== undefined && !isStringArray(object[field])) throw new InvalidFixtureError(`${path}.${field} must be an array of strings`);
}
function normalizeText(value) { return String(value).toLowerCase(); }
function detectUnsafe(text) {
  const notes = [];
  if (hasAffirmativeDurableAction(text)) notes.push('Request mentions an external or durable action; require explicit approval before side effects.');
  if (/\b(secret|token|password|credential)\b/.test(text)) notes.push('Request may contain sensitive data; redact before sharing or logging.');
  return notes;
}
function hasAffirmativeDurableAction(text) {
  const action = '(?:apply|applies|applied|applying|approve|approves|approved|approving|install|installs|installed|installing|publish|publishes|published|publishing|send|sends|sent|sending|delete|deletes|deleted|deleting|charge|charges|charged|charging|merge|merges|merged|merging)';
  const actions = text.matchAll(new RegExp(`\\b${action}\\b`, 'gu'));
  return [...actions].some((match) => !isNegatedAction(text, match.index));
}
function isNegatedAction(text, actionIndex) {
  const beforeAction = text.slice(0, actionIndex);
  const boundaries = [...beforeAction.matchAll(/(?:[.;:!?]|\b(?:and|but|however|then)\b)/gu)];
  const clauseStart = boundaries.at(-1)?.index;
  const clause = beforeAction.slice(clauseStart === undefined ? 0 : clauseStart + boundaries.at(-1)[0].length);
  const negations = [...clause.matchAll(/\b(?:do\s+not|don't|never|without)\b/gu)];
  const negation = negations.at(-1);
  if (!negation) return false;
  const intervening = clause.slice(negation.index + negation[0].length);
  return (intervening.match(/[\p{L}\p{N}_-]+/gu) ?? []).length <= 8;
}
function scoreSkill(request, skill) {
  const terms = [skill.name, ...(skill.triggers ?? []), ...descriptionPhrases(skill.description)].map(normalizeText).filter(Boolean);
  const matched = [...new Set(terms.filter((term) => term.length > 2 && matchesTerm(request, term)))];
  return { skill, score: matched.length, reasons: matched.slice(0, 5) };
}
function descriptionPhrases(description) {
  if (!description) return [];
  const stopWords = new Set(['a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with']);
  const words = normalizeText(description).match(/[\p{L}\p{N}_-]+/gu) ?? [];
  const meaningful = words.filter((word) => word.length > 2 && !stopWords.has(word));
  return meaningful.slice(0, -1).map((word, index) => `${word} ${meaningful[index + 1]}`);
}
function matchesTerm(request, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u').test(request);
}
function requiredInputs(skill) { return Array.isArray(skill.requiredInputs) ? skill.requiredInputs : []; }
function normalizeSideEffects(sideEffects) {
  const declarations = Array.isArray(sideEffects) ? sideEffects : [sideEffects];
  return declarations.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}
function hasInput(request, item) { return matchesTerm(request, normalizeText(item)); }
export function formatTriageReport(result) {
  const lines = ['# Skill Intake Triage', `Action: ${result.action}`, `Selected skill: ${result.selectedSkill ?? 'none'}`, `Missing inputs: ${result.missingInputs.length ? result.missingInputs.join(', ') : 'none'}`, 'Safety notes:', ...(result.safetyNotes.length ? result.safetyNotes.map((note) => `- ${note}`) : ['- none'])];
  return lines.join('\n');
}
