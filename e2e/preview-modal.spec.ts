import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"
import path from "path"
import fs from "fs"
import os from "os"

test.describe("preview modal", () => {
    let tmpFile: string

    test.beforeAll(() => {
        tmpFile = path.join(os.tmpdir(), "shelf-e2e-preview.txt")
        fs.writeFileSync(tmpFile, "preview content")
    })

    test.afterAll(() => {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    })

    useCleanGrid()

    test("preview a file via double-click then close with Escape", async ({ page }) => {
        const fileInput = page.locator("#upload-input").first()
        await fileInput.setInputFiles(tmpFile)

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("shelf-e2e-preview.txt")

        await item.dblclick()

        const modal = page.getByTestId("preview-modal")
        await expect(modal).toBeVisible()
        await expect(modal).toContainText("shelf-e2e-preview.txt")

        await page.keyboard.press("Escape")
        await expect(modal).not.toBeVisible()
    })

    test("pasting while the preview is open does not paste onto the main page", async ({ page }) => {
        const fileInput = page.locator("#upload-input").first()
        await fileInput.setInputFiles(tmpFile)

        const items = page.locator("[data-transfer-id]")
        await expect(items).toHaveCount(1)

        await items.first().dblclick()
        const modal = page.getByTestId("preview-modal")
        await expect(modal).toBeVisible()

        const firePaste = () => page.evaluate(() => {
            const dt = new DataTransfer()
            dt.setData("text/plain", "sneaky paste")
            window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }))
        })

        await firePaste()
        await expect(items).toHaveCount(1)

        // Sanity check: the same paste lands once the modal is closed
        await page.keyboard.press("Escape")
        await expect(modal).not.toBeVisible()
        await firePaste()
        await expect(items).toHaveCount(2)
        await expect(page.locator("[data-transfer-id]", { hasText: "sneaky paste" })).toBeVisible()
    })
})
