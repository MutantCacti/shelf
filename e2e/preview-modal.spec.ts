import { test, expect } from "@playwright/test"
import { login, clearTransfers } from "./helpers"
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

    test.beforeEach(async ({ page }) => {
        await login(page)
        await clearTransfers(page)
        await page.reload()
        await page.getByTestId("transfer-grid").waitFor()
    })

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
})
