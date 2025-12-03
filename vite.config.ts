import { defineConfig } from 'vite';


const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base: base,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});

