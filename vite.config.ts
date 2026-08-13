import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' 让构建产物可以从任意路径（含 file:// 子目录、静态托管）直接打开
export default defineConfig({
  plugins: [react()],
  base: './',
})
