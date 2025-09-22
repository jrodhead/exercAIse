function stripCodeFences(text) {
  if (!text) return text;
  return text.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
}
function safeParse(text) {
  try { return JSON.parse(text); } catch (e) { return null; }
}
module.exports = { stripCodeFences, safeParse };
