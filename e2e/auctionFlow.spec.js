import { test, expect } from '@playwright/test'

test.describe('End-to-End Auction Life-cycle Flow', () => {
  test('creates auction, adds team and player, spins wheel, bids, verifies sold status, checks purse deduction/rankings, resets auction, and deletes auction', async ({ page }) => {
    // 1. Set up automatic confirm dialog handlers to accept confirmation prompts
    page.on('dialog', async dialog => {
      console.log(`💬 Dialog captured: "${dialog.message()}"`);
      await dialog.accept();
    });

    // 2. Visit auction page (which mounts AppLayout and Header with #menu-btn)
    await page.goto('/auction');
    await expect(page).toHaveURL(/\/auction/);

    // 3. Create a temporary new auction
    const menuBtn = page.locator('#menu-btn');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    const createAuctionMenu = page.locator('#menu-create-auction');
    await expect(createAuctionMenu).toBeVisible();
    await createAuctionMenu.click();

    const tempAuctionName = 'Flow Auction ' + Date.now().toString().slice(-4);
    await page.fill('#new-auction-name-input', tempAuctionName);
    await page.click('#create-auction-btn');

    // Wait for SideMenu view to reset and close
    await expect(page.locator('#create-auction-btn')).not.toBeVisible({ timeout: 10000 });

    // 4. Navigate to Teams & Create a Team
    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams/);

    const addTeamBtn = page.locator('#add-team-btn');
    await expect(addTeamBtn).toBeVisible();
    await addTeamBtn.click();

    const teamName = 'Flow Team ' + Date.now().toString().slice(-4);
    await page.fill('#team-name-input', teamName);
    await page.fill('#team-purse-input', '100');
    await page.fill('#team-max-players-input', '10');
    await page.click('button[type="submit"]');

    // Wait until team card is visible
    await expect(page.locator(`text=${teamName}`).first()).toBeVisible({ timeout: 10000 });

    // 5. Navigate to Players & Register a Player
    await page.goto('/players');
    await expect(page).toHaveURL(/\/players/);

    const addPlayerBtn = page.locator('#register-player-btn');
    await expect(addPlayerBtn).toBeVisible();
    await addPlayerBtn.click();

    const playerName = 'Flow Player ' + Date.now().toString().slice(-4);
    await page.fill('#player-name-input', playerName);
    await page.selectOption('#player-role-select', 'Batter');
    await page.fill('#player-age-input', '25');
    await page.selectOption('#player-style-select', 'RHB');
    await page.fill('#player-matches-input', '30');
    await page.fill('#player-base-price-input', '1.0');
    await page.click('button[type="submit"]');

    // Search to confirm the player is registered
    const searchInput = page.locator('#player-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(playerName);
    await expect(page.locator('.player-card', { hasText: playerName }).first()).toBeVisible({ timeout: 10000 });

    // 6. Go to Auction arena page and run Bidding flow
    await page.goto('/auction');
    await expect(page).toHaveURL(/\/auction/);

    // Spin wheel to select the player
    const wheelCanvas = page.locator('canvas').first();
    await expect(wheelCanvas).toBeVisible({ timeout: 15000 });
    await wheelCanvas.click();

    // Wait for Bidding Modal to open
    const biddingModal = page.locator('.modal-overlay');
    await expect(biddingModal).toBeVisible({ timeout: 15000 });
    
    // Verify player is on the modal
    const regexName = new RegExp(playerName, 'i');
    await expect(biddingModal).toContainText(regexName);

    // Place a bid for our team (+0.0L to pick at base price 1.0L)
    const bidBtn = page.locator('button:has-text("+0L")').first();
    await expect(bidBtn).toBeVisible();
    await bidBtn.click();

    // Verify current bid displays
    await expect(page.locator('text=Current Bid')).toBeVisible();

    // Click "SOLD!" button to sell the player to the team
    const soldBtn = page.locator('button:has-text("SOLD!")');
    await expect(soldBtn).toBeVisible();
    await soldBtn.click();

    // Wait for modal to close
    await expect(biddingModal).not.toBeVisible({ timeout: 10000 });

    // 7. Check Teams Page: verify player is registered under the team & purse is reduced
    await page.goto('/teams');
    const teamCard = page.locator(`text=${teamName}`).first();
    await expect(teamCard).toBeVisible();
    await teamCard.click();

    // Check player is in roster list
    await expect(page.locator(`text=${playerName}`)).toBeVisible();
    
    // Check purse is reduced (100 - 1.0 = 99.0 L left)
    const statsContainer = page.locator('.stats-row');
    await expect(statsContainer).toContainText('99.0');

    // 8. Check Rankings Page: verify player shows up with final bid
    await page.goto('/rankings');
    await expect(page).toHaveURL(/\/rankings/);
    
    // Rankings displays the table rows. Check that our player is in there
    await expect(page.locator('.rankings-table')).toContainText(playerName);
    await expect(page.locator('.rankings-table')).toContainText('₹1L');

    // 9. Reset Auction: marks player as available and restores team budget
    await page.locator('#menu-btn').click();
    const resetBtn = page.locator('#menu-reset-auction');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Wait for page to reload/menu to close
    await expect(resetBtn).not.toBeVisible({ timeout: 5000 });

    // Navigate to Teams and verify purse restored & roster empty
    await page.goto('/teams');
    await page.locator(`text=${teamName}`).first().click();
    await expect(page.locator(`text=${playerName}`)).not.toBeVisible();
    await expect(page.locator('.stats-row')).toContainText('100.0');

    // Navigate to Rankings and verify leaderboard empty state is shown
    await page.goto('/rankings');
    await expect(page.locator('text=No Results Yet')).toBeVisible();

    // 10. Delete the temporary auction
    await page.locator('#menu-btn').click();
    const deleteBtn = page.locator('#menu-delete-auction');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Wait for redirect to empty state "No Auction Selected"
    await expect(page.locator('text=No Auction Selected')).toBeVisible({ timeout: 10000 });
  })
})
