import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"

test.describe("text transfer happy path", () => {
    useCleanGrid()

    test("create a text transfer via the input", async ({ page }) => {
        await page.getByPlaceholder("Send text").fill("Hello world!")
        await page.getByPlaceholder("Send text").press("Enter")

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("Hello world!")
    })
})
