import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat config.
 *
 * `eslint-config-next` v16 exports a ready `Linter.Config[]` that already bundles
 * typescript-eslint, eslint-plugin-react, react-hooks, import and jsx-a11y, so
 * this file spreads it rather than layering more presets on top (which would
 * register the same plugins twice).
 *
 * The overrides are scoped to TypeScript files and re-declare the plugin: in flat
 * config a rule is only resolvable in a config object where its plugin is
 * registered, so an unscoped override would fail on .mjs files.
 */
const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },
  ...next,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
