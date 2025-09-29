const fs = require('fs');
const path = require('path');

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

function trimForTokens(text, maxLines) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n');
}

// Very lightweight history summarizer placeholder (real implementation can parse performed/*.json)
function summarizeHistory(limit) {
  // Placeholder: scan workouts directory for last few JSON workouts for simple exercise list.
  // This avoids implementing full history parsing yet.
  const workoutsDir = path.resolve(__dirname, '..', '..', '..', 'workouts');
  let summary = [];
  try {
    const files = fs.readdirSync(workoutsDir).filter(f => f.endsWith('.json')).slice(-limit);
    files.forEach(f => {
      // shallow read
      const content = readFileSafe(path.join(workoutsDir, f));
      // try parse quickly
      try {
        const obj = JSON.parse(content);
        if (obj && obj.sections) {
          const exNames = [];
            obj.sections.forEach(sec => {
              (sec.exercises||[]).forEach(e => { if (e && e.name) exNames.push(e.name); });
            });
          if (exNames.length) summary.push(f + ': ' + exNames.slice(0,5).join(', '));
        }
      } catch (e) {}
    });
  } catch (e) {}
  return summary;
}

async function assemblePrompt(payload) {
  const root = path.resolve(__dirname, '..', '..', '..');
  const kaiPersona = readFileSafe(path.join(root, '.github', 'instructions', 'kai.instructions.md'));
  const personal = readFileSafe(path.join(root, '.github', 'instructions', 'kai.personal.instructions.md'));
  const blockProg = readFileSafe(path.join(root, '.github', 'instructions', 'block-progression.instructions.md'));
  const sessionPrompt = readFileSafe(path.join(root, '.github', 'prompts', 'generate-workout-session.prompt.md'));

  const historyLines = summarizeHistory(3);

  const system = [
    'You are Kai, a strength, movement & recovery coach AI.',
    'Follow all safety, adaptation, and formatting rules.',
    'Output ONLY valid JSON matching schemas/session.schema.json.',
    'Do not include markdown fences or explanations.'
  ].join('\n');

  const user = [
    'USER REQUEST CONTEXT:',
    JSON.stringify(payload || {}),
    '',
    'PERSONAL INSTRUCTIONS (truncated):',
    trimForTokens(personal, 140),
    '',
    'BLOCK PROGRESSION (truncated):',
    trimForTokens(blockProg, 120),
    '',
    'PROMPT GUIDELINES (truncated):',
    trimForTokens(sessionPrompt, 160),
    '',
    'RECENT HISTORY (light summary):',
    historyLines.join('\n'),
    '',
    'Return only JSON.'
  ].join('\n');

  return { system, user };
}

module.exports = { assemblePrompt };
