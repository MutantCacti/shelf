import { test, expect } from "@playwright/test"
import { login, clearTransfers } from "./helpers"

test.describe("text transfer happy path", () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await clearTransfers(page)
        await page.reload()
        await page.getByTestId("transfer-grid").waitFor()
    })

    test("create a text transfer via the input", async ({ page }) => {
        await page.getByPlaceholder("Send text").fill("Hello world!")
        await page.getByPlaceholder("Send text").press("Enter")

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("Hello world!")
    })
})
