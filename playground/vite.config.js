import { defineConfig } from 'vite'

export default defineConfig({
  root: 'playground',
  build: {
    outDir: 'dist-playground',
    rollupOptions: {
      input: {
        main: 'playground/index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
