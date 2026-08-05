import { test, expect } from "@playwright/test"
import { useCleanGrid } from "./helpers"

test.describe("colour grouping", () => {
    useCleanGrid()

    async function createText(page, content: string) {
        await page.getByPlaceholder("Send text").fill(content)
        await page.getByPlaceholder("Send text").press("Enter")
        await expect(page.locator("[data-transfer-id]", { hasText: content })).toBeVisible()
    }

    test("number key groups the selection, persists, and toggles off", async ({ page }) => {
        await createText(page, "alpha")
        await createText(page, "beta")

        const alpha = page.locator("[data-transfer-id]", { hasText: "alpha" })
        await alpha.click()
        await page.keyboard.press("1")

        await expect(alpha).toHaveClass(/group-tinted/)

        // Persists across reload, and the grouped item moves to the front
        await page.reload()
        await page.getByTestId("transfer-grid").waitFor()
        await expect(page.locator("[data-transfer-id]", { hasText: "alpha" })).toHaveClass(/group-tinted/)
        const ordered = page.locator("[data-transfer-id]")
        await expect(ordered.first()).toContainText("alpha")

        // Same key toggles the group off
        await page.locator("[data-transfer-id]", { hasText: "alpha" }).click()
        await page.keyboard.press("1")
        await expect(page.locator("[data-transfer-id]", { hasText: "alpha" })).not.toHaveClass(/group-tinted/)
    })

    test("palette button assigns a group via a swatch", async ({ page }) => {
        await createText(page, "gamma")

        const gamma = page.locator("[data-transfer-id]", { hasText: "gamma" })
        await gamma.click()

        // Upload button swaps to the palette while a selection exists
        await expect(page.getByTitle("Upload files")).toHaveCount(0)
        await page.getByTitle("Group colours").first().click()

        // Every swatch must resolve its --color-group-N variable to a real,
        // distinct colour (Tailwind prunes @theme vars it can't see referenced
        // statically — regression guard for the invisible-swatch bug)
        const swatchColors = await page.getByTestId("group-palette")
            .locator("button[aria-label^='Group']")
            .evaluateAll(els => els.map(el => getComputedStyle(el).backgroundColor))
        expect(swatchColors).toHaveLength(10)
        expect(swatchColors).not.toContain("rgba(0, 0, 0, 0)")
        expect(new Set(swatchColors).size).toBe(10)

        await page.getByTestId("group-palette").getByLabel("Group 5").click()
        await expect(gamma).toHaveClass(/group-tinted/)

        // Selection survives the assignment; "No colour" clears the group again
        await page.getByTitle("Group colours").first().click()
        await page.getByTestId("group-palette").getByLabel("No colour").click()
        await expect(gamma).not.toHaveClass(/group-tinted/)
    })

    test("typing numbers with nothing selected still goes to the text input", async ({ page }) => {
        await expect(page.getByPlaceholder("Send text")).toBeEnabled()
        await page.keyboard.press("4")
        await expect(page.getByPlaceholder("Send text")).toHaveValue("4")
    })
})
