import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  server: { watch: { ignored: ['**/src-tauri/**'] } }, // Prevents Vite from restarting the server when files in src-tauri change
})