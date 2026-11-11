import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/super-admin',
  plugins: [react(), nxViteTsPaths(), tailwindcss()],
  resolve: {
    alias: {
      '@app/api': resolve(__dirname, '../../libs/shared/api/src/index.ts'),
      '@app/auth': resolve(__dirname, '../../libs/shared/auth/src/index.tsx'),
      '@app/config': resolve(__dirname, '../../libs/shared/config/src/index.ts'),
      '@app/forms': resolve(__dirname, '../../libs/shared/forms/src/index.ts'),
      '@app/query': resolve(__dirname, '../../libs/shared/query/src/index.tsx'),
      '@app/ui/components': resolve(__dirname, '../../libs/shared/ui/src/components'),
      '@app/ui/hooks': resolve(__dirname, '../../libs/shared/ui/src/hooks'),
      '@app/ui': resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      '@app/features-ops': resolve(__dirname, '../../libs/features/ops/src/index.tsx'),
    },
  },
  server: {
    port: 4201,
    host: 'localhost',
  },
  preview: {
    port: 4301,
    host: 'localhost',
  },
  build: {
    outDir: '../../dist/apps/super-admin',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
});
