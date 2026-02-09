import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three') || id.includes('@react-three') || id.includes('postprocessing')) {
            return 'three-vendor'
          }
          if (id.includes('maplibre-gl')) {
            return 'maplibre-vendor'
          }
          if (id.includes('react-flow')) {
            return 'reactflow-vendor'
          }
        },
      },
    },
  }
})
