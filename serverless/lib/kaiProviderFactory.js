const { GptOssProvider } = require('./providers/gptOssProvider');

function createKaiProvider() {
  const use = process.env.KAI_PROVIDER || 'gpt-oss';
  if (use === 'gpt-oss') {
    return new GptOssProvider({
      endpoint: process.env.GPT_OSS_ENDPOINT || 'http://localhost:8000/v1/chat/completions'
    });
  }
  throw new Error('Unsupported KAI_PROVIDER: ' + use);
}

module.exports = { createKaiProvider };
