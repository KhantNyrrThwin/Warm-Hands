// Lets plain Node (>= 23) run the app's TypeScript, whose imports omit ".ts".
//   node --import ./tools/avatar/ts-resolve.mjs <script>
import { registerHooks } from 'node:module'
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (error) {
      if (!/^\.{1,2}\//.test(specifier) || /\.[cm]?[jt]sx?$/.test(specifier)) throw error
      for (const ext of ['.ts', '.tsx']) {
        try { return next(specifier + ext, context) } catch { /* try next */ }
      }
      throw error
    }
  },
})
