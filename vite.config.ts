import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['html5-qrcode'],
    exclude: ['react-icons']
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignora gli avvisi TypeScript non critici durante la build
        if (warning.code === 'TS2307' || 
            warning.code === 'TS6133' || 
            warning.code === 'TS2614' || 
            warning.code === 'TS7006' ||
            warning.code === 'TS18046') {
          return;
        }
        warn(warning);
      }
    }
  }
})
