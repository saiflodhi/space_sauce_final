import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        scene2: 'scene2.html'
      }
    }
  }
})
