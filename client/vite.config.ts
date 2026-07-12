import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Allow phone testing through a Cloudflare quick tunnel (HTTPS is required
    // for mic/speech APIs on mobile browsers)
    allowedHosts: ['.trycloudflare.com'],
  },
})
