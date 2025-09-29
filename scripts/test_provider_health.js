#!/usr/bin/env node
// Simple provider health check: sends a tiny chat request and validates structure.

const provider = process.env.KAI_PROVIDER || 'gpt-oss';
const apiKey = process.env.GPT_OSS_API_KEY;
let endpoint, model;
if (provider === 'ollama') {
  endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/chat';
  model = process.env.OLLAMA_MODEL || 'llama3';
} else {
  endpoint = process.env.GPT_OSS_ENDPOINT || 'http://localhost:8000/v1/chat/completions';
  model = process.env.GPT_OSS_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct';
}

(async () => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
    let res, data, content;
    if (provider === 'ollama') {
      const body = {
        model,
        messages: [
          { role: 'system', content: 'You respond ONLY with a JSON object {"alive":true}.' },
          { role: 'user', content: 'Ping' }
        ],
        stream: false,
        options: { temperature: 0 }
      };
      res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.ok) {
        data = await res.json();
        content = data?.message?.content || '';
      } else {
        // fallback streaming parse
        const body2 = {
          model,
          messages: body.messages,
          options: { temperature: 0 }
        };
        res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body2) });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const obj = JSON.parse(lines[i]);
            if (obj?.message?.content) { content = obj.message.content; break; }
          } catch (_) {}
        }
      }
    } else {
      const body = {
        model,
        messages: [
          { role: 'system', content: 'You respond ONLY with a JSON object {"alive":true}.' },
          { role: 'user', content: 'Ping' }
        ],
        max_tokens: 50,
        temperature: 0
      };
      res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      data = await res.json();
      content = data?.choices?.[0]?.message?.content || '';
    }
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) {}
    if (!parsed || parsed.alive !== true) {
      console.error('Unexpected content:', content.slice(0,200));
      process.exit(2);
    }
    console.log('Provider OK:', { provider, endpoint, model });
  } catch (e) {
    console.error('Provider health check failed:', e.message);
    process.exit(1);
  }
})();
