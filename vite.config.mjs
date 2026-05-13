import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    command === 'serve' ? vueDevTools() : undefined,
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      services: fileURLToPath(new URL('./src/services', import.meta.url)),
      composables: fileURLToPath(new URL('./src/composables', import.meta.url)),
      interfaces: fileURLToPath(new URL('./src/interfaces', import.meta.url)),
      views: fileURLToPath(new URL('./src/views', import.meta.url)),
    },
  },
}))
