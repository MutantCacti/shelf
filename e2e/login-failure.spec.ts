import { test, expect } from "@playwright/test"

test.describe("login failure", () => {
    test("wrong password shows error and blocks grid access", async ({ page }) => {
        await page.goto("/")
        await page.getByLabel("Password").fill("wrong-password")
        await page.getByRole("button", { name: "Sign in" }).click()

        await expect(page.getByTestId("login-error")).toBeVisible()
        await expect(page.getByTestId("login-error")).toHaveText("Invalid password")

        // Grid should not be accessible
        await expect(page.getByTestId("transfer-grid")).not.toBeVisible()
    })
})
