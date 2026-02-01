import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
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
];
const sonarjsAvailableRules = new Set(Object.keys(sonarjs.rules ?? {}));
// NOTE: The SonarJS v3 plugin removed `no-one-iteration-loop`; filtering avoids config errors.
const sonarjsAllRules = Object.fromEntries(
  sonarjsLegacyRules
    .filter((rule) => sonarjsAvailableRules.has(rule))
    .map((rule) => [`sonarjs/${rule}`, 'error']),
);
const sonarMappedCoreRules = {
  curly: ['warn', 'all'],
  eqeqeq: ['error', 'always'],
  'eol-last': 'error',
  'no-alert': 'warn',
  'no-case-declarations': 'error',
  'no-caller': 'error',
  'no-console': 'error',
  'no-constant-binary-expression': 'error',
  'no-constructor-return': 'error',
  'no-continue': 'warn',
  'no-debugger': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-empty-pattern': 'error',
  'no-extend-native': 'error',
  'no-extra-bind': 'error',
  'no-extra-boolean-cast': 'error',
  'no-import-assign': 'error',
  'no-lone-blocks': 'error',
  'no-loss-of-precision': 'error',
  'no-multi-str': 'error',
  'no-new-func': 'error',
  'no-new-native-nonconstructor': 'error',
  'no-nonoctal-decimal-escape': 'error',
  'no-octal': 'error',
  'no-octal-escape': 'error',
  'no-proto': 'error',
  'no-return-await': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-sequences': 'error',
  'no-setter-return': 'error',
  'no-sparse-arrays': 'error',
  'no-template-curly-in-string': 'error',
  'no-trailing-spaces': 'error',
  'no-undef-init': 'error',
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'no-unsafe-optional-chaining': 'error',
  'no-unreachable-loop': 'error',
  'no-unused-private-class-members': 'error',
  'no-useless-call': 'error',
  'no-useless-constructor': 'error',
  'no-useless-escape': 'error',
  'no-useless-rename': 'error',
  'no-with': 'error',
  'prefer-const': 'error',
  'prefer-object-has-own': 'error',
  'prefer-object-spread': 'error',
  'prefer-regex-literals': 'error',
  'prefer-spread': 'error',
  'prefer-template': 'error',
  radix: 'error',
  'valid-typeof': 'error',
};
const sonarMappedTypeScriptRules = {
  '@typescript-eslint/adjacent-overload-signatures': 'error',
  '@typescript-eslint/consistent-type-assertions': 'error',
  '@typescript-eslint/default-param-last': 'error',
  '@typescript-eslint/no-base-to-string': 'error',
  '@typescript-eslint/no-confusing-non-null-assertion': 'error',
  '@typescript-eslint/no-duplicate-enum-values': 'error',
  '@typescript-eslint/no-empty-interface': 'error',
  '@typescript-eslint/no-extraneous-class': 'error',
  '@typescript-eslint/no-misused-new': 'error',
  '@typescript-eslint/no-mixed-enums': 'error',
  '@typescript-eslint/no-non-null-assertion': 'warn',
  '@typescript-eslint/no-redeclare': 'error',
  '@typescript-eslint/no-redundant-type-constituents': 'error',
  '@typescript-eslint/no-shadow': 'warn',
  '@typescript-eslint/no-this-alias': 'error',
  '@typescript-eslint/no-unnecessary-type-arguments': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-unnecessary-type-constraint': 'error',
  '@typescript-eslint/no-unused-expressions': [
    'error',
    { allowShortCircuit: true, allowTaggedTemplates: true },
  ],
  '@typescript-eslint/prefer-as-const': 'error',
  '@typescript-eslint/prefer-enum-initializers': 'error',
  '@typescript-eslint/prefer-for-of': 'error',
  '@typescript-eslint/prefer-function-type': 'error',
  '@typescript-eslint/prefer-literal-enum-member': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'warn',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/prefer-promise-reject-errors': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/prefer-return-this-type': 'error',
  '@typescript-eslint/prefer-string-starts-ends-with': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'warn',
};
const sonarMappedImportRules = {
  'import/no-absolute-path': 'error',
  'import/no-duplicates': 'error',
  'import/no-mutable-exports': 'error',
  'import/no-self-import': 'error',
};
const sonarMappedStylisticRules = {
  '@stylistic/comma-dangle': 'off',
  '@stylistic/no-extra-semi': 'error',
  '@stylistic/semi': ['error', 'always'],
};
const sonarMappedReactRules = {
  'react/hook-use-state': 'error',
  'react/jsx-child-element-spacing': 'error',
  'react/jsx-key': 'error',
  'react/jsx-no-comment-textnodes': 'error',
  'react/jsx-no-constructed-context-values': 'error',
  'react/jsx-no-useless-fragment': 'warn',
  'react/jsx-pascal-case': 'error',
  'react/no-access-state-in-setstate': 'error',
  'react/no-array-index-key': 'warn',
  'react/no-children-prop': 'error',
  'react/no-danger-with-children': 'error',
  'react/no-deprecated': 'error',
  'react/no-direct-mutation-state': 'error',
  'react/no-find-dom-node': 'error',
  'react/no-is-mounted': 'error',
  'react/no-redundant-should-component-update': 'error',
  'react/no-render-return-value': 'error',
  'react/no-string-refs': 'error',
  'react/no-this-in-sfc': 'error',
  'react/no-unknown-property': 'error',
  'react/no-unsafe': 'error',
  'react/no-unstable-nested-components': 'warn',
  'react/no-unescaped-entities': 'error',
};
const sonarMappedJsxA11yRules = {
  'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-unsupported-elements': 'error',
  'jsx-a11y/autocomplete-valid': 'error',
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/img-redundant-alt': 'error',
  'jsx-a11y/interactive-supports-focus': 'error',
  'jsx-a11y/no-access-key': 'error',
  'jsx-a11y/no-aria-hidden-on-focusable': 'error',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
  'jsx-a11y/no-noninteractive-element-interactions': 'error',
  'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
  'jsx-a11y/no-noninteractive-tabindex': 'error',
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/no-static-element-interactions': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',
};
const sonarMappedUnicornRules = {
  'unicorn/catch-error-name': 'error',
  'unicorn/consistent-function-scoping': 'warn',
  'unicorn/error-message': 'error',
  'unicorn/new-for-builtins': 'error',
  'unicorn/no-instanceof-builtins': 'error',
  'unicorn/no-invalid-fetch-options': 'error',
  'unicorn/no-named-default': 'error',
  'unicorn/no-negated-condition': 'warn',
  'unicorn/no-object-as-default-parameter': 'error',
  'unicorn/no-thenable': 'error',
  'unicorn/no-this-assignment': 'error',
  'unicorn/no-typeof-undefined': 'error',
  'unicorn/no-useless-length-check': 'error',
  'unicorn/no-useless-promise-resolve-reject': 'error',
  'unicorn/no-useless-spread': 'error',
  'unicorn/no-zero-fractions': 'error',
  'unicorn/numeric-separators-style': 'warn',
  'unicorn/prefer-array-find': 'error',
  'unicorn/prefer-array-flat': 'error',
  'unicorn/prefer-array-flat-map': 'error',
  'unicorn/prefer-array-index-of': 'error',
  'unicorn/prefer-array-some': 'error',
  'unicorn/prefer-date-now': 'error',
  'unicorn/prefer-default-parameters': 'error',
  'unicorn/prefer-dom-node-dataset': 'error',
  'unicorn/prefer-dom-node-remove': 'error',
  'unicorn/prefer-global-this': 'warn',
  'unicorn/prefer-includes': 'error',
  'unicorn/prefer-math-min-max': 'error',
  'unicorn/prefer-math-trunc': 'error',
  'unicorn/prefer-native-coercion-functions': 'warn',
  'unicorn/prefer-node-protocol': 'error',
  'unicorn/prefer-number-properties': 'error',
  'unicorn/prefer-regexp-test': 'error',
  'unicorn/prefer-set-has': 'error',
  'unicorn/prefer-set-size': 'error',
  'unicorn/prefer-single-call': 'error',
  'unicorn/prefer-string-raw': 'warn',
  'unicorn/prefer-string-replace-all': 'error',
  'unicorn/prefer-string-trim-start-end': 'error',
  'unicorn/prefer-structured-clone': 'error',
  'unicorn/prefer-type-error': 'error',
  'unicorn/prefer-at': 'error',
  'unicorn/prefer-export-from': 'warn',
};

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
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      ...reactHooks.configs.recommended.rules,

      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
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
      ...sonarMappedTypeScriptRules,
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unnecessary-type-parameters': 'error',
      '@typescript-eslint/await-thenable': 'error',
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

  // RATIONALE: Wire Sonar-mapped ESLint plugins so rules like S7781 can be enforced in ESLint.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      unicorn,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      react,
      '@stylistic': stylistic,
    },
    rules: {
      ...sonarMappedCoreRules,
      ...sonarMappedImportRules,
      ...sonarMappedJsxA11yRules,
      ...sonarMappedReactRules,
      ...sonarMappedStylisticRules,
      ...sonarMappedUnicornRules,
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
    },
  },
];
