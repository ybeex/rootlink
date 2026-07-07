import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any':    'error',
      '@typescript-eslint/no-unused-vars':     ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'lucide-react',
          importNames: ['Image'],
          message: "Import as 'Image as ImageIcon' — the bare name collides with next/image's Image component. This exact mistake has been made and fixed three times already (see RootLink_MultiDisciplinary_Audit.md, Finding B4).",
        }],
      }],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
