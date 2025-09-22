#!/usr/bin/env node
// Simple provider health check: sends a tiny chat request and validates structure.

const fetch = require('node-fetch');

const endpoint = process.env.GPT_OSS_ENDPOINT || 'http://localhost:8000/v1/chat/completions';
const model = process.env.GPT_OSS_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct';
const apiKey = process.env.GPT_OSS_API_KEY;

(async () => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
    const body = {
      model,
      messages: [
        { role: 'system', content: 'You respond ONLY with a JSON object {"alive":true}.' },
        { role: 'user', content: 'Ping' }
      ],
      max_tokens: 50,
      temperature: 0
    };
    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) {}
    if (!parsed || parsed.alive !== true) {
      console.error('Unexpected content:', content.slice(0,200));
      process.exit(2);
    }
    console.log('Provider OK:', { endpoint, model });
  } catch (e) {
    console.error('Provider health check failed:', e.message);
    process.exit(1);
  }
})();
