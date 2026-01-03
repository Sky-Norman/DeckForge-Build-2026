import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  base: './', // Ensures assets use relative paths for static hosting (Azure/S3)
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});