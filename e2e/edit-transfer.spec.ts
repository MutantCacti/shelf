import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"
import path from "path"
import fs from "fs"
import os from "os"

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

    test("committing a file rename with Enter does not trigger a download", async ({ page }) => {
        const tmpFile = path.join(os.tmpdir(), "shelf-e2e-rename.txt")
        fs.writeFileSync(tmpFile, "rename me")

        let downloaded = false
        page.on("download", () => { downloaded = true })

        try {
            await page.locator("#upload-input").first().setInputFiles(tmpFile)

            const item = page.locator("[data-transfer-id]").first()
            await expect(item).toContainText("shelf-e2e-rename.txt")

            await item.click()
            await page.keyboard.press("F2")

            const input = page.locator("input[aria-label='Edit']")
            await expect(input).toBeVisible()
            await input.fill("renamed.txt")
            await input.press("Enter")

            await page.keyboard.press("Escape")
            await expect(item).toContainText("renamed.txt")
            expect(downloaded).toBe(false)
        } finally {
            fs.unlinkSync(tmpFile)
        }
    })
})
