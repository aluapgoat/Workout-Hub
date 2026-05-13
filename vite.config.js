import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub project Pages live at /<repo-name>/; set VITE_BASE in CI (see .github/workflows)
  base: process.env.VITE_BASE || '/',
})
