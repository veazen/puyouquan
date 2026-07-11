module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true, jest: true },
  ignorePatterns: ['dist/', 'coverage/'],
  rules: {
    // Security guardrail from PROJECT_PLAN §2.4: all randomness must come from crypto.randomBytes
    'no-restricted-properties': [
      'error',
      {
        object: 'Math',
        property: 'random',
        message: 'Use crypto.randomBytes — Math.random is forbidden (PROJECT_PLAN §2.4).',
      },
    ],
  },
};
