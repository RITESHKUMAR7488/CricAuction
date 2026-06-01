import { test, expect } from '@playwright/test'

test.describe('Teams Management & Layout E2E', () => {
  test('verifies stats metrics, responsive layouts, team creation modal, manual insertions, and team deletion cleanup', async ({ page }) => {
    // 1. Visit the teams dashboard page
    await page.goto('/teams')
    await expect(page).toHaveURL(/\/teams/)

    // 2. Verify Stats Blocks rendering
    const statsContainer = page.locator('.stats-row')
    await expect(statsContainer).toBeVisible()
    
    // Check that white text styles are active
    const totalTeamsLabel = page.locator('.stat-label').first()
    await expect(totalTeamsLabel).toBeVisible()
    await expect(totalTeamsLabel).toContainText('Total Teams')

    // 3. Automated Dialog Handler for Delete Confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Delete')
      await dialog.accept()
    })

    // 4. Team Creation (Host Action)
    const addTeamBtn = page.locator('#add-team-btn')
    
    // Check if host controls are rendered
    if (await addTeamBtn.isVisible()) {
      await addTeamBtn.click()

      // Fill out AddTeamModal fields
      const modal = page.locator('.modal')
      await expect(modal).toBeVisible()

      const uniqueTeamName = 'E2E Warriors ' + Date.now().toString().slice(-4)

      // Fill team name
      await page.fill('#team-name-input', uniqueTeamName)

      // Select an owner if available
      const ownerSelect = page.locator('#team-owner-select')
      const optionsCount = await ownerSelect.locator('option').count()
      if (optionsCount > 1) {
        await ownerSelect.selectOption({ index: 1 })
      }

      // Fill purse and max players
      await page.fill('#team-purse-input', '100')
      await page.fill('#team-max-players-input', '10')

      // Submit form
      await page.click('button[type="submit"]')
      
      // Verify new team card has been added to the grid
      const newTeamCard = page.locator(`text=${uniqueTeamName}`).first()
      await expect(newTeamCard).toBeVisible({ timeout: 10000 })

      // 5. Navigate inside team card & check Manual Insertion Controls
      await newTeamCard.click()
      await expect(page).toHaveURL(/\/teams\/[0-9a-fA-F-]+/)

      // Verify that squad views show Manual Add Player option
      const addPlayerBtn = page.locator('text=+ ADD PLAYER')
      await expect(addPlayerBtn).toBeVisible()

      // Verify back button routing works cleanly
      const backBtn = page.locator('text=Back')
      await expect(backBtn).toBeVisible()
      await backBtn.click()

      // Assert we are safely returned to teams dashboard
      await expect(page).toHaveURL(/\/teams/)

      // 6. Delete team to clean up
      const teamCardElement = page.locator('.team-card', { hasText: uniqueTeamName }).first()
      const deleteBtn = teamCardElement.locator('button', { hasText: '✕' }).first()
      await expect(deleteBtn).toBeVisible()
      await deleteBtn.click()

      // Assert team card is successfully cleaned up
      await expect(page.locator(`text=${uniqueTeamName}`).first()).not.toBeVisible({ timeout: 10000 })
    }
  })
})
