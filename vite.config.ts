import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['html5-qrcode', 'react-icons', 'react-icons/fa'],
    exclude: []
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
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
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
