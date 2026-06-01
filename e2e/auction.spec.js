import { test, expect } from '@playwright/test'

test.describe('Active Auction Spin & Bidding E2E', () => {
  test('verifies centered live badge, co-sponsor strip, spin wheel drawing actions, bidding modal overlays, and close cancel flows', async ({ page }) => {
    // 1. Visit the active auction arena page
    await page.goto('/auction')
    await expect(page).toHaveURL(/\/auction/)

    // 2. Verify centered live auction header badge is present
    const liveBadge = page.locator('.header-live-badge')
    await expect(liveBadge).toBeVisible()

    // 3. Verify that the BricX co-sponsor advertising strip is active (visible on mobile, hidden on desktop)
    const sponsorStrip = page.locator('.sponsor-strip-bar')
    const viewport = page.viewportSize()
    if (viewport && viewport.width < 1024) {
      await expect(sponsorStrip).toBeVisible()
    } else {
      await expect(sponsorStrip).toBeHidden()
    }

    // 4. Verify SpinWheel component is mounted (check canvas exists)
    const wheelCanvas = page.locator('canvas').first()
    await expect(wheelCanvas).toBeVisible({ timeout: 15000 })
    
    // 5. Automate Spin Wheel click (Host action only)
    await wheelCanvas.click()

    // Wait for the spinning wheel to stop and open the Bidding Modal (modal-overlay)
    const biddingModal = page.locator('.modal-overlay')
    await expect(biddingModal).toBeVisible({ timeout: 10000 })

    // 6. Verify Bidding Modal layout elements
    const currentBid = page.locator('text=Current Bid')
    await expect(currentBid).toBeVisible()

    // Verify top-right close cross (✕) exists
    const closeCross = biddingModal.locator('button', { hasText: '✕' })
    await expect(closeCross).toBeVisible()

    // Click close cross to cancel bidding and verify modal closes
    await closeCross.click()
    await expect(biddingModal).not.toBeVisible({ timeout: 5000 })
  })
})
