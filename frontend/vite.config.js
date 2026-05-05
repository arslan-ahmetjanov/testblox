import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // curlconverter / tree-sitter use top-level await
    target: 'esnext',
  },
});
