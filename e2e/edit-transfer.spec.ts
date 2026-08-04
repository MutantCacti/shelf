import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"

test.describe("edit transfer", () => {
    useCleanGrid()

    test("rename a text transfer via F2 in the preview modal", async ({ page }) => {
        await page.getByPlaceholder("Send text").fill("before edit")
        await page.getByPlaceholder("Send text").press("Enter")

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("before edit")

        // Select the item, then F2 to open the preview modal in rename mode
        await item.click()
        await page.keyboard.press("F2")

        const editor = page.locator("[aria-label='Edit'][contenteditable='true']")
        await expect(editor).toBeVisible()

        await editor.fill("after edit")
        await page.getByLabel("Save").click()

        // commitEdit leaves the modal open; close it so we can verify the grid
        await page.keyboard.press("Escape")

        await expect(item).toContainText("after edit")
        await expect(item).not.toContainText("before edit")
    })
})
