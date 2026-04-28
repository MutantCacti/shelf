import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const httpsEnabled = process.env.VITE_HTTPS === '1'
const certPath = resolve('./certs/cert.pem')
const keyPath = resolve('./certs/key.pem')
const httpsConfig = httpsEnabled && existsSync(certPath) && existsSync(keyPath)
    ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
    : undefined

const apiProtocol = httpsEnabled ? 'https' : 'http'

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
        ...(httpsConfig && { https: httpsConfig }),
        proxy: {
            '/api': {
                target: `${apiProtocol}://127.0.0.1:${process.env.VITE_API_PORT || 8000}`,
                rewrite: (path) => path.replace(/^\/api/, ''),
                secure: false,
            }
        },
        dns: { order: 'ipv4first' },
    }
})
