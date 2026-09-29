import react from '@vitejs/plugin-react'
// `defineConfig` from 'vitest/config' re-exports Vite's own helper and adds
// no behavior of its own — vite/vite build/vite preview are unaffected, this
// just lets the `test` block below be recognized by the Vitest CLI.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
