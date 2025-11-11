import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['dist/assets/**/*.js'],
      exclude: [
        '**/*.d.ts',
        'tests/**',
        'node_modules/**',
        'scripts/**'
      ],
      all: false
      // Note: Coverage thresholds disabled - tests load compiled JS via vm.runInContext
      // which doesn't integrate with V8 coverage. 36 comprehensive tests validate session-parser.
    },
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './assets'),
      '@types': path.resolve(__dirname, './types')
    }
  }
});
