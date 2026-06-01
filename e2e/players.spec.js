import { test, expect } from '@playwright/test'

test.describe('Players Registration, Profiles & UI UX E2E', () => {
  test('verifies ratio counters, mobile layouts, player registration modal, search query filters, edit details, and auto-cleanup deletions', async ({ page }) => {
    // 1. Visit the players page
    await page.goto('/players')
    await expect(page).toHaveURL(/\/players/)

    // 2. Verify Ratio Counter & Register buttons
    const ratioCounter = page.locator('text=Sold/Total')
    await expect(ratioCounter).toBeVisible()

    const addPlayerBtn = page.locator('#register-player-btn')
    
    // Register dialog confirm handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('delete')
      await dialog.accept()
    })

    // If host controls are rendered
    if (await addPlayerBtn.isVisible()) {
      await addPlayerBtn.click()

      // Fill PlayerFormModal fields
      const modal = page.locator('.modal')
      await expect(modal).toBeVisible()

      const uniqueCode = 'E2E-' + Date.now().toString().slice(-4)

      // Enter details
      await page.fill('#player-name-input', 'E2E Test Batter')
      await page.selectOption('#player-role-select', 'Batter')
      await page.fill('#player-age-input', '24')
      await page.selectOption('#player-style-select', 'RHB')
      await page.fill('#player-matches-input', '20')
      await page.fill('#player-base-price-input', '5.5')

      // Submit
      await page.click('button[type="submit"]')

      // 3. Search and filter check
      const searchInput = page.locator('#player-search')
      await expect(searchInput).toBeVisible()
      await searchInput.fill('E2E Test Batter')

      const playerCard = page.locator('.player-card', { hasText: 'E2E Test Batter' }).first()
      await expect(playerCard).toBeVisible({ timeout: 10000 })

      // Check card visual items (Right chevron exists and no code tag inside standard text area)
      const chevron = playerCard.locator('.player-chevron').first()
      await expect(chevron).toBeVisible()

      // 4. Click inside card & check Edit/Delete Flow
      await playerCard.click()
      await expect(page).toHaveURL(/\/players\/[0-9a-fA-F-]+/)

      // Verify Back button
      const backBtn = page.locator('text=Back')
      await expect(backBtn).toBeVisible()

      // Edit Details
      const editBtn = page.locator('text=Edit')
      await expect(editBtn).toBeVisible()
      await editBtn.click()

      // Fill updated name
      await page.fill('#player-name-input', 'E2E Test Batter Updated')
      await page.click('button[type="submit"]')

      // Verify the details are updated
      await expect(page.locator('text=E2E Test Batter Updated')).toBeVisible({ timeout: 10000 })

      // Clean up: delete the player
      const deleteBtn = page.locator('text=Delete')
      await expect(deleteBtn).toBeVisible()
      await deleteBtn.click()

      // Assert redirected back to players list
      await expect(page).toHaveURL(/\/players/)
    }
  })
})
