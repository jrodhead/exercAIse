/**
 * Test helper to load compiled session-parser module
 * Since session-parser attaches to window.ExercAIse, we need to load the compiled JS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadSessionParser() {
  // Read the compiled session-parser.js from dist/
  const distPath = path.resolve(__dirname, '../../dist/assets/session-parser.js');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      'session-parser.js not found in dist/assets/. Run "npm run build" first.'
    );
  }

  const code = fs.readFileSync(distPath, 'utf-8');

  // Create a sandbox with window object
  const sandbox: any = {
    window: {},
    console: console
  };

  // Execute the code in the sandbox
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  if (!sandbox.window?.ExercAIse?.SessionParser) {
    console.error('sandbox.window:', sandbox.window);
    console.error('ExercAIse:', sandbox.window?.ExercAIse);
    throw new Error('Failed to load SessionParser from compiled module');
  }
  
  return sandbox.window.ExercAIse.SessionParser;
}
