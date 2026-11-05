import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// `npm run dev:clinic` (mode "lan") serves over HTTPS on every network
// interface so a second phone/tablet on the same Wi-Fi or hotspot can join.
// Browsers only allow the camera and microphone on HTTPS (or localhost).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'lan' ? [basicSsl()] : [])],
  server: {
    host: mode === 'lan' ? true : undefined,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.WH_AI_PORT || '8000'}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
}))
