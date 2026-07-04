import { defineConfig } from 'vite'

export default defineConfig({
  base: '/StudentManager/', 
  server: {
    port: 5173,
    strictPort: true
  }
})
