/**
 * Test helper to load compiled form-builder module with mocked dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadFormBuilder() {
  // Read the compiled form-builder.js from dist/
  const distPath = path.resolve(__dirname, '../../dist/assets/form-builder.js');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      'form-builder.js not found in dist/assets/. Run "npm run build" first.'
    );
  }

  const code = fs.readFileSync(distPath, 'utf-8');

  // Create mock DOM elements and dependencies
  const mockElement = () => ({
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    hasAttribute: vi.fn(() => false),
    removeAttribute: vi.fn(),
    click: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn()
  });

  const mockDocument = {
    getElementById: vi.fn((id: string) => mockElement()),
    querySelector: vi.fn((selector: string) => mockElement()),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn((tag: string) => mockElement()),
    createTextNode: vi.fn((text: string) => ({ textContent: text }))
  };

  // Create sandbox with window and document mocks
  const sandboxWindow: any = {
    ExercAIse: {},
    document: mockDocument,
    console: console,
    alert: vi.fn(),
    confirm: vi.fn(() => true),
    prompt: vi.fn(),
    open: vi.fn(),
    location: { href: '' },
    navigator: {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      }
    }
  };

  const sandbox: any = {
    window: sandboxWindow,
    document: mockDocument,
    console: console,
    alert: vi.fn(),
    confirm: vi.fn(() => true)
  };

  // Execute the code in the sandbox
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  if (!sandbox.window?.ExercAIse?.FormBuilder) {
    throw new Error('Failed to load FormBuilder from compiled module');
  }

  // Create minimal dependencies for init
  const mockDeps = {
    slugify: (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    extractExercisesFromJSON: vi.fn(() => []),
    extractExercisesFromMarkdown: vi.fn(() => []),
    parseJSONPrescriptions: vi.fn(),
    parseMarkdownPrescriptions: vi.fn(),
    loadSaved: vi.fn(() => []),
    saveLocal: vi.fn(),
    parseHMSToSeconds: vi.fn((val: any) => {
      if (!val) return null;
      const num = Number(val);
      if (!isNaN(num)) return num;
      const parts = String(val).split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return null;
    }),
    secondsToHHMMSS: vi.fn((sec: number) => {
      if (!sec) return '';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }),
    renderMarkdownBasic: vi.fn((md: string) => md),
    fixExerciseAnchors: vi.fn(),
    status: vi.fn(),
    getCurrentSessionJSON: vi.fn(() => null),
    workoutContent: mockElement(),
    exerciseFormsEl: mockElement(),
    saveBtn: mockElement(),
    copyBtn: mockElement(),
    downloadBtn: mockElement(),
    issueBtn: mockElement(),
    clearBtn: mockElement(),
    copyWrapper: mockElement(),
    copyTarget: mockElement(),
    openIssueLink: mockElement()
  };

  // Initialize FormBuilder with mocked dependencies
  sandbox.window.ExercAIse.FormBuilder.init(mockDeps);

  return {
    FormBuilder: sandbox.window.ExercAIse.FormBuilder,
    sandbox,
    mockDeps,
    mockDocument
  };
}
