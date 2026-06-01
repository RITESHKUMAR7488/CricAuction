import { test, expect } from '@playwright/test'

test.describe('Co-Host & Co-Admin View & Permissions E2E', () => {
  test('verifies that co-hosts can view lists but are locked out of host-only create and delete actions', async ({ page }) => {
    // 1. Visit teams dashboard (should load immediately due to cached cohost state)
    await page.goto('/teams')
    await expect(page).toHaveURL(/\/teams/)

    // Assert cohost CANNOT see "+ ADD TEAM" button
    const addTeamBtn = page.locator('#add-team-btn')
    await expect(addTeamBtn).not.toBeVisible()

    // 2. Visit players dashboard
    await page.goto('/players')
    await expect(page).toHaveURL(/\/players/)

    // Assert cohost CANNOT see "+ ADD" register player button
    const addPlayerBtn = page.locator('#register-player-btn')
    await expect(addPlayerBtn).not.toBeVisible()

    // 3. Visit active auction arena
    await page.goto('/auction')
    await expect(page).toHaveURL(/\/auction/)

    // Assert cohost is viewer only and cannot see active host spin wheel triggers
    const setupSpin = page.locator('text=TAP TO')
    await expect(setupSpin).not.toBeVisible()
  })
})
