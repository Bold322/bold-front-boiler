import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/*.config.{js,cjs,mjs,ts}',
      '**/vite.config.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/**/*.{ts,tsx}', 'libs/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // react-refresh only matters at app/HMR boundaries. Library barrels under
  // libs/** intentionally mix components, hooks, and types in one file
  // (e.g. @app/query, @app/auth, the shadcn variant files); their
  // consumers HMR fine because they import from the package, not the file.
  // App entry points (apps/*/src/main.tsx) define the route tree inline
  // and aren't HMR-targeted either.
  {
    files: ['libs/**/*.{ts,tsx}', 'apps/*/src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
