import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: '../dist-playground',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
