import { test, expect } from '@playwright/test'

test.describe('Cricket Auction - Landing Page & Navigation E2E', () => {
  test('successfully loads the cinematic landing page and navigates to the login/auth route', async ({ page }) => {
    // 1. Visit the landing page
    await page.goto('/')

    // 2. Verify that the cinematic landing page loads successfully
    // We expect the main header to contain the key title text "Ultimate Cricket Auction"
    // We use a custom timeout to allow database initialization on cold starts
    const heading = page.locator('h1.lp-h1')
    await expect(heading).toBeVisible({ timeout: 15000 })
    await expect(heading).toContainText('The Ultimate')
    await expect(heading).toContainText('Cricket Auction')

    // 3. Verify the main CTA button is visible
    const startCta = page.locator('.lp-btn-primary')
    await expect(startCta).toBeVisible()
    
    // We also expect the Sign In buttons to be visible
    const signInNav = page.locator('.lp-nav-signin')
    await expect(signInNav).toBeVisible()

    // 4. Click the "Start for Free" CTA and verify navigation works
    await startCta.click()

    // Since we are unauthenticated in this clean test browser session, 
    // clicking should route us straight to the /login page
    await expect(page).toHaveURL(/\/login/)
    
    // Verify that the login page heading is visible
    const loginHeader = page.locator('h1')
    await expect(loginHeader).toContainText('ELITE LEAGUE')
  })
})
