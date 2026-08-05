import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"

test.describe("selection model", () => {
    useCleanGrid()

    async function createText(page, content: string) {
        await page.getByPlaceholder("Send text").fill(content)
        await page.getByPlaceholder("Send text").press("Enter")
        await expect(page.locator("[data-transfer-id]", { hasText: content })).toBeVisible()
    }

    test("plain click replaces the selection, ctrl+click toggles", async ({ page }) => {
        await createText(page, "one")
        await createText(page, "two")
        await createText(page, "three")

        const one = page.locator("[data-transfer-id]", { hasText: "one" })
        const two = page.locator("[data-transfer-id]", { hasText: "two" })

        await one.click()
        await expect(one).toHaveClass(/active/)

        // Plain click on another item drops the previous selection
        await two.click()
        await expect(two).toHaveClass(/active/)
        await expect(one).not.toHaveClass(/active/)

        // Ctrl+click adds without dropping, then removes again
        await one.click({ modifiers: ["ControlOrMeta"] })
        await expect(one).toHaveClass(/active/)
        await expect(two).toHaveClass(/active/)

        await one.click({ modifiers: ["ControlOrMeta"] })
        await expect(one).not.toHaveClass(/active/)
        await expect(two).toHaveClass(/active/)
    })

    test("shift+click selects the range between anchor and target", async ({ page }) => {
        await createText(page, "one")
        await createText(page, "two")
        await createText(page, "three")

        // Grid order is newest first: three, two, one
        await page.locator("[data-transfer-id]", { hasText: "three" }).click()
        await page.locator("[data-transfer-id]", { hasText: "one" }).click({ modifiers: ["Shift"] })

        for (const content of ["one", "two", "three"]) {
            await expect(page.locator("[data-transfer-id]", { hasText: content })).toHaveClass(/active/)
        }
    })
})
