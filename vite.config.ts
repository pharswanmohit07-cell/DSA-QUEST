import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Preview proxy host allowance; this is not part of the production fix.
    allowedHosts: true,
  },
})
