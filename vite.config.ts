import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: 'index.html',
        scene2: 'scene2.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})