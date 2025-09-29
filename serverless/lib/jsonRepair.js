function stripCodeFences(text) {
  if (!text) return text;
  // If the entire block is wrapped once, remove those outer fences only.
  return text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/,'')
    .trim();
}

function safeParse(text) {
  try { return JSON.parse(text); } catch (e) { return null; }
}

// Attempt to parse any fenced code blocks first (```json ... ``` or ``` ... ```)
function parseFromCodeFences(text) {
  if (!text) return null;
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fenceRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    const parsed = safeParse(candidate);
    if (parsed) return parsed;
  }
  return null;
}

// Scan for the first balanced JSON object or array and attempt parse.
function extractFirstJSONValue(text) {
  if (!text) return null;
  // 1. Try direct whole text first in case it's clean.
  const direct = safeParse(stripCodeFences(text));
  if (direct) return direct;

  // 2. Try fenced blocks.
  const fenced = parseFromCodeFences(text);
  if (fenced) return fenced;

  // 3. Streaming outputs sometimes concatenate; find earliest successful '{...}' or '[...]'
  const candidates = [];
  const openChars = ['{','['];
  for (const oc of openChars) {
    const cc = oc === '{' ? '}' : ']';
    let depth = 0;
    let start = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === oc) {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === cc) {
        if (depth > 0) depth--;
        if (depth === 0 && start >= 0) {
          const slice = text.slice(start, i + 1);
          const parsed = safeParse(slice);
          if (parsed) {
            candidates.push({ index: start, value: parsed });
            break; // take the earliest for this char type
          } else {
            // Reset to look for another potential top-level start
            start = -1;
          }
        }
      }
    }
  }
  if (candidates.length) {
    candidates.sort((a,b)=> a.index - b.index);
    return candidates[0].value;
  }

  // 4. Last resort: take substring between first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    const parsed = safeParse(slice);
    if (parsed) return parsed;
  }
  return null;
}

module.exports = { stripCodeFences, safeParse, extractFirstJSONValue };
// Sanitize common loose JSON patterns (numeric ranges, unit suffixes) to improve parse success.
function sanitizeLooseJSON(text) {
  if (!text) return text;
  let out = text;
  // Convert number ranges with optional units (e.g., 8-12 or 65-75lbs) to quoted strings
  out = out.replace(/:(\s*)(\d+)\s*-\s*(\d+)(lb|lbs)?(?=\s*[},])/gi, (m, sp, a, b, unit) => `: "${a}-${b}${unit ? unit.toLowerCase() : ''}"`);
  // Convert standalone weight with unit : 75lbs to numeric 75
  out = out.replace(/:(\s*)(\d+)(lb|lbs)(?=\s*[},])/gi, ': $2');
  // Ensure trailing commas not breaking (remove dangling , before })
  out = out.replace(/,\s*(\}|\])/g, '$1');
  return out;
}

module.exports.sanitizeLooseJSON = sanitizeLooseJSON;
