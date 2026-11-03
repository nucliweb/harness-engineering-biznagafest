import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

const upwards = (names, paths, message) => ({
  group: [...names.flatMap((n) => [n, `${n}/*`]), ...paths],
  message,
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.{js,mjs,cjs}', 'vitest.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Layer boundaries: agenda -> ui -> core, nothing upwards.
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: restrict([
      {
        group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-router', 'react-router/*', 'react-router-dom'],
        message: 'Layer rule: core is pure TypeScript and must not import React or a router.',
      },
      upwards(
        ['@agenda/ui', '@agenda/app'],
        ['**/packages/ui/**', '**/apps/**', '../../ui/**', '../../../apps/**'],
        'Layer rule: core imports nothing from the workspace.',
      ),
    ]),
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    rules: restrict([
      {
        group: ['react-router', 'react-router/*', 'react-router-dom'],
        message: 'Layer rule: ui has no routing. Receive links through props.',
      },
      upwards(
        ['@agenda/app'],
        ['**/apps/**'],
        'Layer rule: ui may import core only, never the app.',
      ),
    ]),
  },
  {
    files: ['apps/**/*.{ts,tsx}'],
    rules: restrict([
      {
        group: ['**/packages/**'],
        message: 'Layer rule: import workspace packages by name (@agenda/ui, @agenda/core), not by relative path.',
      },
    ]),
  },
);
