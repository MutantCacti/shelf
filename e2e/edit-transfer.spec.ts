import { test, expect } from "@playwright/test"
import { login, clearTransfers } from "./helpers"

test.describe("edit transfer", () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await clearTransfers(page)
        await page.reload()
        await page.getByTestId("transfer-grid").waitFor()
    })

    test("edit a text transfer via context menu", async ({ page }) => {
        await page.getByPlaceholder("Send text").fill("before edit")
        await page.getByPlaceholder("Send text").press("Enter")

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("before edit")

        await item.click({ button: "right" })

        const textarea = page.locator("textarea")
        await expect(textarea).toBeVisible()

        await textarea.fill("after edit")
        // Blur commits the edit — more reliable than Enter in headless
        await textarea.blur()

        await expect(item).toContainText("after edit")
        await expect(item).not.toContainText("before edit")
    })
})
