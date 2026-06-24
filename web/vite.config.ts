import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works on any static host (Netlify, Vercel,
// GitHub Pages project subpaths, plain file hosting).
// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
})
