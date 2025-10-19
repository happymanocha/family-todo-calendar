module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'consistent-return': 'off',
    'no-underscore-dangle': 'off',
    'prefer-destructuring': 'warn',
    'class-methods-use-this': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/*.test.js'],
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
};
