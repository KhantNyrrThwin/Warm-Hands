// Dev server for the avatar render checks. Same app, but resolves .ts/.tsx
// before .js so stray compiled .js files next to the sources are ignored.
//   npx vite --config tools/avatar/vite.render.config.ts --port 5199
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { extensions: ['.tsx', '.ts', '.mjs', '.js', '.jsx', '.json'] },
  server: { strictPort: true },
})
