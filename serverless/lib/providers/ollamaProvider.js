
// Ollama native chat endpoint differs from OpenAI; we adapt it.
class OllamaProvider {
  constructor(opts) {
    this.endpoint = opts.endpoint || 'http://localhost:11434';
    this.model = opts.model || process.env.OLLAMA_MODEL || 'llama3';
    this.temperature = opts.temperature != null ? opts.temperature : 0.1;
    this.maxTokens = opts.maxTokens || 1536; // soft cap; Ollama doesn't use same param
  }
  name() { return 'ollama'; }
  async generateSession(promptInput) {
    // Combine system + user into a single prompt because Ollama's simple /api/chat supports role messages
    const messages = [
      { role: 'system', content: promptInput.system },
      { role: 'user', content: promptInput.user }
    ];
    // Try non-stream first (Ollama 0.1.26+ supports stream:false)
    let respText = null;
    let res = await fetch(this.endpoint + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: { temperature: this.temperature }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const content = data && data.message && data.message.content;
      if (!content) throw new Error('Empty ollama response');
      return content.trim();
    }
    // Fallback: maybe server older version streaming by default; read text and stitch JSON lines
    res = await fetch(this.endpoint + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages, options: { temperature: this.temperature } })
    });
    if (!res.ok) throw new Error('ollama request failed ' + res.status + ' ' + res.statusText);
    respText = await res.text();
    // Streaming returns NDJSON lines each a JSON object; take last with message.content
    const lines = respText.split(/\r?\n/).filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(lines[i]);
        if (obj && obj.message && obj.message.content) {
          return obj.message.content.trim();
        }
      } catch (e) { /* ignore */ }
    }
    throw new Error('Unable to extract content from ollama streaming response');
  }
}

module.exports = { OllamaProvider };
