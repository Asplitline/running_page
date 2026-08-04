import process from 'node:process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

// 精简版：去掉旧 SVGR 配色映射与 activities 手动分包
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  base: process.env.PATH_PREFIX || '/',
  build: {
    outDir: './dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
