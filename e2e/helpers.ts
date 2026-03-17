import { type Page } from "@playwright/test"

export async function login(page: Page, password = "test") {
    await page.goto("/")
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.getByTestId("transfer-grid").waitFor()
}

// Delete all transfers through the frontend proxy so cookies are included
export async function clearTransfers(page: Page) {
    const res = await page.request.get("/api/transfers")
    const transfers = await res.json()

    if (transfers.length > 0) {
        const ids = transfers.map((t: { id: number }) => t.id)
        await page.request.post("/api/transfers/batch-delete", {
            data: { ids },
        })
    }
}
