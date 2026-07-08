import {defineConfig} from 'vite'
import {fileURLToPath, URL} from 'url'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import {resolve} from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), UnoCSS()],
  base: process.env.NODE_ENV === 'production' ? '/travelTaiwan/' : '',
  resolve: {
    alias: {
      // @ 替代为 src
      // '@': resolve(__dirname, 'src'),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // @component 替代为 src/component
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
