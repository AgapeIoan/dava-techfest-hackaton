import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ingest': { target: 'http://localhost:8000', changeOrigin: true },
      '/patients': { target: 'http://localhost:8000', changeOrigin: true },
    }
  }
})
