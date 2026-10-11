import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Permite cargar .env desde frontend/ o desde la raíz del repositorio
const localEnv = path.resolve(__dirname, '.env')
const rootEnv = path.resolve(__dirname, '../.env')
const envDir = fs.existsSync(localEnv)
  ? __dirname
  : (fs.existsSync(rootEnv) ? path.resolve(__dirname, '..') : __dirname)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir,
  server: {
    port: 3000,
    open: false
  }
})
