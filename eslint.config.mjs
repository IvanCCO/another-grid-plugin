import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // scripts/ uses CommonJS require() and is not type-checked
    ignores: ['dist/**', 'node_modules/**', 'artifacts/**', 'scripts/**'],
  },
  {
    rules: {
      'max-lines': [
        'error',
        { max: 700, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
);
