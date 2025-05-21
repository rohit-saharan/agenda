export default [
  {
    files: ['**/*.js'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest'
    },
    rules: {
      'no-var': 'error'
    }
  }
];

