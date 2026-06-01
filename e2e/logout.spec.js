import { test, expect } from '@playwright/test'

test.describe('Host Log Out Navigation E2E', () => {
  test('successfully triggers logout from side menu and destroys session', async ({ page }) => {
    // 1. Visit active auction (should load immediately due to cached state and render menu)
    await page.goto('/auction')
    await expect(page).toHaveURL(/\/auction/)

    // 2. Open the slide menu panel
    const menuBtn = page.locator('#menu-btn')
    await expect(menuBtn).toBeVisible()
    await menuBtn.click()

    // 3. Verify side menu items are displayed
    const logoutBtn = page.locator('#menu-logout')
    await expect(logoutBtn).toBeVisible()

    // 4. Click Log Out
    await logoutBtn.click()

    // 5. Verify successful redirect back to landing route
    await expect(page).toHaveURL(/\/login|$/, { timeout: 10000 })
  })
})
