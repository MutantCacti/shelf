import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        exclude: ['e2e/**', 'node_modules/**'],
    },
    server: {
        proxy: {
            '/api': {
                target: `http://127.0.0.1:${process.env.VITE_API_PORT || 8000}`,
                rewrite: (path) => path.replace(/^\/api/, ''),
            }
        },
        dns: { order: 'ipv4first' },
    }
})
