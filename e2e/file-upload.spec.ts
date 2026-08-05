import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"
import path from "path"
import fs from "fs"
import os from "os"

test.describe("file upload happy path", () => {
    let tmpFile: string

    test.beforeAll(() => {
        tmpFile = path.join(os.tmpdir(), "shelf-e2e-test.txt")
        fs.writeFileSync(tmpFile, "e2e test content")
    })

    test.afterAll(() => {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    })

    useCleanGrid()

    test("upload a file and see it in the grid", async ({ page }) => {
        const fileInput = page.locator("#upload-input").first()
        await fileInput.setInputFiles(tmpFile)

        const item = page.locator("[data-transfer-id]").first()
        await expect(item).toContainText("shelf-e2e-test.txt")
    })
})
