import globals from 'globals';

// Minimal react-hooks rule registration so existing `// eslint-disable react-hooks/*`
// directives resolve without pulling in a plugin that is not installed.
const reactHooksPlugin = {
  rules: {
    'exhaustive-deps': { create: () => ({}) },
    'rules-of-hooks': { create: () => ({}) },
  },
};

export default [
  { ignores: ['dist/**', 'node_modules/**', '*.config.js'] },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooksPlugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-cond-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
    },
  },
];
