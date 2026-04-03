import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite para la app D&D 5e
export default defineConfig({
  plugins: [react()],
  // Proxy para evitar problemas CORS con la API de D&D en desarrollo
  server: {
    proxy: {
      '/dndapi': {
        target: 'https://www.dnd5eapi.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dndapi/, '')
      }
    }
  }
})
