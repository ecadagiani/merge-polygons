module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  rules: {
    'no-await-in-loop': 'off',
    'max-len': ['warn', { code: 150, ignoreComments: true }],
  },
};
