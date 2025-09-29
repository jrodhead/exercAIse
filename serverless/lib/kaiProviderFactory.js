const { GptOssProvider } = require('./providers/gptOssProvider');
const { OllamaProvider } = require('./providers/ollamaProvider');

function createKaiProvider() {
  const use = process.env.KAI_PROVIDER || 'gpt-oss';
  if (use === 'gpt-oss') {
    return new GptOssProvider({
      endpoint: process.env.GPT_OSS_ENDPOINT || 'http://localhost:8000/v1/chat/completions'
    });
  } else if (use === 'ollama') {
    return new OllamaProvider({
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
    });
  }
  throw new Error('Unsupported KAI_PROVIDER: ' + use);
}

module.exports = { createKaiProvider };
