module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'node_modules', 'src/components/ui/index.js'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // The context provider and its consumer hook belong together.
      files: ['src/context/**/*.jsx'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
}
