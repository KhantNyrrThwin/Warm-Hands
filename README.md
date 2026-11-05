# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
"# Warm-Hands" 

## Clinic conversation (doctor ↔ patient on two devices)

1. On the clinic computer start the AI server (`npm run dev:ai`) and the web app for the local network: `npm run dev:clinic` (HTTPS, required for camera and microphone on the second device).
2. Connect both devices to the same Wi‑Fi or phone hotspot.
3. Doctor device: choose **ဆရာဝန် / Doctor** → *အခန်းအသစ် ဖွင့်ရန်*. The screen shows a 4‑digit room code and the address for the patient device.
4. Patient device: open that address (accept the self-signed certificate warning), choose **လူနာ / Patient** and enter the code.

What each side sees (Messenger-style chat; every MSL message is its own looping character animation inside the bubble):

| | Sent messages (right) | Received messages (left) |
|---|---|---|
| Doctor (types or speaks) | text + MSL animation | patient's recognised text |
| Patient (signs to camera) | MSL animation only | doctor's message as MSL animation only |

Service seams: `src/api/translation.ts` (text → MSL), `src/animation/signRenderer.ts` (one shared 3D renderer drawing every bubble's animation), `src/hooks/useSignCapture.ts` (camera → MSL recognition over `/api/live`), `src/api/conversation.ts` (room relay over `/api/room/{code}`, falls back to two tabs on one device when the AI server is not running).
