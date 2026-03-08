import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Node.js built-ins referenced in eyeling's remote-deref paths (never called
// for pure in-memory reasoning). Mark them external so the browser bundle
// does not try to resolve them.
// Note: 'buffer' is intentionally excluded — it has a browser polyfill.
const nodeBuiltins = [
  'fs', 'os', 'path', 'child_process',
  'http', 'https', 'url', 'zlib', 'crypto',
  'node:fs', 'node:os', 'node:path', 'node:child_process',
  'node:http', 'node:https', 'node:url',
]

export default defineConfig({
  root: 'playground',
  base: process.env.GITHUB_PAGES ? '/rdf-facade-experiments/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer/',
      'node:buffer': 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['eyeling/eyeling.js', 'buffer'],
    esbuildOptions: {
      platform: 'browser',
      external: nodeBuiltins,
    },
  },
  build: {
    outDir: 'dist-playground',
    rollupOptions: {
      input: { main: 'playground/index.html' },
      external: nodeBuiltins,
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
