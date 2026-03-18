import { test, expect } from "@playwright/test"
import { login, clearTransfers } from "./helpers"

test.describe("delete transfer", () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await clearTransfers(page)
        await page.reload()
        await page.getByTestId("transfer-grid").waitFor()
    })

    test("create then delete a text transfer", async ({ page }) => {
        await page.getByPlaceholder("Send text").fill("delete me")
        await page.getByPlaceholder("Send text").press("Enter")

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("delete me")

        // Select, wait for debounce
        await item.click()
        await expect(item).toHaveClass(/active/, { timeout: 500 })

        await page.keyboard.press("Delete")

        // Confirm in modal
        await page.getByRole("button", { name: "Delete", exact: true }).click()

        // The deleted item should be gone
        await expect(page.getByText("delete me")).toHaveCount(0)
    })
})
