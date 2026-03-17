import { defineConfig } from "@playwright/test"

const headed = !JSON.parse(process.env.CI || "false") && process.argv.some(a => a === "--headed")

export default defineConfig({
    testDir: "./e2e",
    timeout: headed ? 60_000 : 30_000,
    retries: 0,
    workers: headed ? 1 : undefined,
    use: {
        baseURL: "http://localhost:9001",
        headless: !headed,
        launchOptions: {
            slowMo: headed ? 2500 : 0,
        },
    },
    projects: [
        { name: "chromium", use: { browserName: "chromium" } },
    ],
})
