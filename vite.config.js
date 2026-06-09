import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`

function emitVersionPlugin(buildId) {
  return {
    name: 'emit-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
  },
  plugins: [react(), emitVersionPlugin(BUILD_ID)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
