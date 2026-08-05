import { test, type Page } from "@playwright/test"

export async function login(page: Page, password = "test") {
    await page.goto("/")
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.getByTestId("transfer-grid").waitFor()
}

// Delete all transfers through the frontend proxy so cookies are included.
// The API removes uploaded files and thumbnails along with the DB rows.
export async function clearTransfers(page: Page) {
    const res = await page.request.get("/api/transfers")
    if (!res.ok()) return

    const transfers = await res.json()

    if (transfers.length > 0) {
        const ids = transfers.map((t: { id: number }) => t.id)
        await page.request.post("/api/transfers/batch-delete", {
            data: { ids },
        })
    }
}

// Log in and hand the test an empty grid, then clear again once it finishes.
// Clearing on both sides keeps runs repeatable: the test data dir is left clean,
// and anything a previous interrupted run left behind is wiped before we start.
export function useCleanGrid() {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await clearTransfers(page)
        await page.reload()
        await page.getByTestId("transfer-grid").waitFor()
    })

    test.afterEach(async ({ page }) => {
        await clearTransfers(page)
    })
}
