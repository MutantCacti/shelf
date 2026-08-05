import { test, expect } from "@playwright/test"
import { login, clearTransfers } from "./helpers"

test.describe("SSE live refresh", () => {
    test("an item created on device A appears on device B without reload", async ({ browser }) => {
        const contextA = await browser.newContext()
        const contextB = await browser.newContext()
        const pageA = await contextA.newPage()
        const pageB = await contextB.newPage()

        try {
            await login(pageA)
            await clearTransfers(pageA)
            await pageA.reload()
            await pageA.getByTestId("transfer-grid").waitFor()

            await login(pageB)
            await expect(pageB.locator("[data-transfer-id]")).toHaveCount(0)

            await pageA.getByPlaceholder("Send text").fill("hello from A")
            await pageA.getByPlaceholder("Send text").press("Enter")

            // No reload on B: the SSE ping triggers the refetch
            await expect(pageB.locator("[data-transfer-id]", { hasText: "hello from A" }))
                .toBeVisible({ timeout: 10000 })

            // Deleting on A disappears on B too
            await pageA.locator("[data-transfer-id]").first().click()
            await pageA.keyboard.press("Delete")
            await pageA.getByRole("button", { name: "Delete", exact: true }).click()
            await expect(pageB.locator("[data-transfer-id]")).toHaveCount(0, { timeout: 10000 })
        } finally {
            await clearTransfers(pageA)
            await contextA.close()
            await contextB.close()
        }
    })
})
