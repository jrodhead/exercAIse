
class GptOssProvider {
  constructor(opts) {
    this.endpoint = opts.endpoint;
    this.model = opts.model || process.env.GPT_OSS_MODEL || 'gpt-oss-kai';
    this.temperature = opts.temperature != null ? opts.temperature : 0.15;
    this.maxTokens = opts.maxTokens || 1800;
  }
  name() { return 'gpt-oss'; }
  async generateSession(promptInput) {
    const messages = [
      { role: 'system', content: promptInput.system },
      { role: 'user', content: promptInput.user }
    ];
    const body = {
      model: this.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens
    };
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.GPT_OSS_API_KEY) headers['Authorization'] = 'Bearer ' + process.env.GPT_OSS_API_KEY;
    const res = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('gpt-oss request failed ' + res.status + ' ' + res.statusText);
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('Empty gpt-oss response');
    return content.trim();
  }
}

module.exports = { GptOssProvider };
