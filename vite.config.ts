import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目站点：https://zhang-stone.github.io/dev-toolbox/
export default defineConfig({
  plugins: [react()],
  base: '/dev-toolbox/',
  server: {
    open: '/dev-toolbox/',
  },
})
