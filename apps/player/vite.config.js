import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { fs: { allow: [here('.'), here('../../games/altc4/ui'), here('../../node_modules')] } },
});
