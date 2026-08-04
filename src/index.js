export function triageSkillIntake(input) {
  const request = normalizeText(input.request ?? '');
  const catalog = Array.isArray(input.catalog) ? input.catalog : [];
  const blocked = detectUnsafe(request);
  const candidates = catalog.map((skill) => scoreSkill(request, skill)).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const missingInputs = best ? requiredInputs(best.skill).filter((item) => !hasInput(request, item)) : [];
  const declaredSideEffects = best?.skill.sideEffects ? [best.skill.sideEffects] : [];
  const action = blocked.length ? 'decline-or-ask-approval' : !best ? 'proceed-without-skill' : missingInputs.length ? 'ask-for-input' : declaredSideEffects.length ? 'decline-or-ask-approval' : 'use-skill';
  return { action, selectedSkill: best?.skill.name ?? null, score: best?.score ?? 0, candidates: candidates.slice(0, 3).map(({skill, score, reasons}) => ({ name: skill.name, score, reasons })), missingInputs, safetyNotes: [...blocked, ...declaredSideEffects] };
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
  const negatedAction = new RegExp(`\\b(?:do\\s+not|don't|never|without)\\s+(?:[\\p{L}\\p{N}_-]+\\s+){0,2}${action}\\b`, 'gu');
  const affirmativeAction = new RegExp(`\\b${action}\\b`, 'u');
  return affirmativeAction.test(text.replace(negatedAction, ''));
}
function scoreSkill(request, skill) {
  const terms = [skill.name, ...(skill.triggers ?? []), ...(skill.description ? skill.description.split(/\W+/) : [])].map(normalizeText).filter(Boolean);
  const matched = [...new Set(terms.filter((term) => term.length > 2 && matchesTerm(request, term)))];
  return { skill, score: matched.length, reasons: matched.slice(0, 5) };
}
function matchesTerm(request, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u').test(request);
}
function requiredInputs(skill) { return Array.isArray(skill.requiredInputs) ? skill.requiredInputs : []; }
function hasInput(request, item) { return request.includes(String(item).toLowerCase()); }
export function formatTriageReport(result) {
  const lines = ['# Skill Intake Triage', `Action: ${result.action}`, `Selected skill: ${result.selectedSkill ?? 'none'}`, `Missing inputs: ${result.missingInputs.length ? result.missingInputs.join(', ') : 'none'}`, 'Safety notes:', ...(result.safetyNotes.length ? result.safetyNotes.map((note) => `- ${note}`) : ['- none'])];
  return lines.join('\n');
}
