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

    test("urls render as links and a leading TODO is highlighted", async ({ page }) => {
        await page.getByPlaceholder("Send text").fill("TODO read https://example.com today")
        await page.getByPlaceholder("Send text").press("Enter")

        const item = page.locator("[data-transfer-id]").first()
        const link = item.getByRole("link")
        await expect(link).toHaveAttribute("href", "https://example.com")
        await expect(link).toHaveAttribute("target", "_blank")
        await expect(item.getByText("TODO", { exact: true })).toBeVisible()

        // Clicking the link must not toggle card selection
        const popup = page.waitForEvent("popup")
        await link.click()
        await (await popup).close()
        await expect(page.getByTitle("Group colours")).toHaveCount(0)
    })
})
