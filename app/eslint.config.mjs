import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import sonarjs from 'eslint-plugin-sonarjs';
import tsdoc from 'eslint-plugin-tsdoc';
import unicorn from 'eslint-plugin-unicorn';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));
const sonarjsLegacyRules = [
  'cognitive-complexity',
  'elseif-without-else',
  'max-switch-cases',
  'no-all-duplicated-branches',
  'no-collapsible-if',
  'no-collection-size-mischeck',
  'no-duplicate-string',
  'no-duplicated-branches',
  'no-element-overwrite',
  'no-empty-collection',
  'no-extra-arguments',
  'no-gratuitous-expressions',
  'no-identical-conditions',
  'no-identical-expressions',
  'no-identical-functions',
  'no-ignored-return',
  'no-inverted-boolean-check',
  'no-nested-switch',
  'no-nested-template-literals',
  'no-one-iteration-loop',
  'no-redundant-boolean',
  'no-redundant-jump',
  'no-same-line-conditional',
  'no-small-switch',
  'no-unused-collection',
  'no-use-of-empty-return-value',
  'no-useless-catch',
  'non-existent-operator',
  'prefer-immediate-return',
  'prefer-object-literal',
  'prefer-single-boolean-return',
  'prefer-while',
  'redundant-type-aliases',
];
const sonarjsAvailableRules = new Set(Object.keys(sonarjs.rules ?? {}));
// NOTE: The SonarJS v3 plugin removed `no-one-iteration-loop`; filtering avoids config errors.
const sonarjsAllRules = Object.fromEntries(
  sonarjsLegacyRules
    .filter((rule) => sonarjsAvailableRules.has(rule))
    .map((rule) => [`sonarjs/${rule}`, 'error']),
);

export default [
  {
    ignores: [
      '**/dist/**',
      '**/dev-dist/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },

  js.configs.recommended,

  // Node scripts (mjs/js/cjs)
  // These scripts often import `console`/`process` explicitly.
  // If we also enable `globals.node`, ESLint can flag that as a redeclare.
  // Fix: keep node globals but disable exactly `console` and `process` globals for scripts.
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '../tools/**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        console: 'off',
        process: 'off',
      },
    },
    rules: {
      // Script output is expected
      'no-console': 'off',
    },
  },

  // Playwright E2E
  {
    files: ['playwright.config.ts', 'e2e/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // App TS/TSX
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      unicorn,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],

      ...reactHooks.configs.recommended.rules,

      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',

      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['__formpackDetailTestUtils'],
        },
      ],
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      tsdoc,
    },
    rules: {
      'tsdoc/syntax': 'error',
    },
  },

  {
    files: ['src/**/*.{tsx,jsx}'],
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...(jsxA11y.flatConfigs.recommended.rules ?? {}),
      'jsx-a11y/label-has-associated-control': 'error',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      unicorn,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      'no-nested-ternary': 'error',
      '@typescript-eslint/no-shadow': 'error',
      'react/no-array-index-key': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'unicorn/prefer-global-this': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/no-array-callback-reference': 'error',
      'unicorn/no-thenable': 'error',
      'unicorn/no-typeof-undefined': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/prefer-single-call': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'prefer-object-has-own': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='role'][value.type='Literal'][value.value='status']",
          message:
            'Use <output> instead of the "status" role to ensure accessibility across all devices.',
        },
        {
          selector:
            "JSXAttribute[name.name='role'][value.type='Literal'][value.value='dialog']",
          message:
            'Use <dialog> instead of the "dialog" role to ensure accessibility across all devices.',
        },
      ],
    },
  },

  // Type-aware rules to match SonarQube findings.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unnecessary-type-parameters': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      'no-void': 'error',
    },
  },

  // NOTE: Restrict SonarJS rules to code covered by SonarQube.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    plugins: {
      sonarjs,
    },
    rules: {
      ...sonarjsAllRules,
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/duplicates-in-character-class': 'error',
      'sonarjs/prefer-regexp-exec': 'error',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      sonarjs,
    },
    rules: {
      'sonarjs/no-nested-functions': ['error', { threshold: 4 }],
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}'],
    plugins: {
      sonarjs,
    },
    rules: {
      'sonarjs/assertions-in-tests': 'error',
    },
  },
];
