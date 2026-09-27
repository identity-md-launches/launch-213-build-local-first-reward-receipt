import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps every asset URL relative so the export works from a
// gateway subpath, an ENS name, or a plain file server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
