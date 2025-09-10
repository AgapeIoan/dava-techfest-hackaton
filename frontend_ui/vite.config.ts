import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ingest': { target: 'http://localhost:8000', changeOrigin: true },
      '/patients': { target: 'http://localhost:8000', changeOrigin: true },
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/merge': { target: 'http://localhost:8000', changeOrigin: true },
      '/match': { target: 'http://localhost:8000', changeOrigin: true },
      '/dedupe': { target: 'http://localhost:8000', changeOrigin: true },
      '/export': { target: 'http://localhost:8000', changeOrigin: true },
      '/intake': { target: 'http://localhost:8000', changeOrigin: true },
    }
  }
})
