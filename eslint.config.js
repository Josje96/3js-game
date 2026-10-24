// Catches the mistakes that have bitten us before: typos in names, missing imports,
// browser-only APIs in shared code. Run: bun run lint
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'public/', 'node_modules/', 'assets/', 'tools/', '.claude/'] }, // .claude/: agent worktrees (whole other checkouts)
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-cond-assign': ['error', 'except-parens'],
    },
  },
  { files: ['src/client/**/*.js', 'src/net/**/*.js', 'src/*.js'], languageOptions: { globals: { ...globals.browser } } },
  // shared/ and server/ also run headless (tests, and maybe a real server one day): no DOM.
  {
    files: ['src/shared/**/*.js', 'src/server/**/*.js'],
    languageOptions: { globals: { ...globals.es2024, performance: 'readonly', console: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', setTimeout: 'readonly', queueMicrotask: 'readonly', structuredClone: 'readonly', Worker: 'readonly', URL: 'readonly', Blob: 'readonly', localStorage: 'readonly' } },
  },
  { files: ['test/**/*.js', 'scripts/**/*.mjs', '*.config.js'], languageOptions: { globals: { ...globals.node } } },
  { files: ['dedicated/**/*.mjs'], languageOptions: { globals: { ...globals.node, Bun: 'readonly' } } }, // the dedicated server runs on Bun
];
