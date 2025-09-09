import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    // API MODE: decomentează proxy-ul când rulezi backendul pe http://localhost:8000
    // proxy: {
    //   '/api': { target: 'http://localhost:8000', changeOrigin: true }
    // }
  }
})
