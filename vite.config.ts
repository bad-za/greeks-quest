import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // относительные пути — сборка работает с любого URL (GitHub Pages, поддиректории и т.п.)
  base: './',
})
