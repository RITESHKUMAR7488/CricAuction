# Cricket Auction Test Suite Documentation

This document describes the structure and coverage of the automated testing suite implemented for the Cricket Auction application. These tests cover mathematical calculations, visual rendering, responsive layouts, multi-role user flows, and permissions.

---

## 1. Unit Tests (Vitest)
Located under: `src/tests/`

### 📄 [math.test.js](file:///c:/Projects/CricketAuction/src/tests/math.test.js)
* **Purpose**: Tests core bidding arithmetic and wallet management logic.
* **Key Scenarios Tested**:
  1. **Purse Accumulation**: Verifies `getTeamSpent` aggregates multiple player final bid amounts correctly.
  2. **Floating-point Precision**: Verifies that adding bid increments does not result in JS float issues (e.g., `0.1 + 0.2` rounding cleanly to `0.3L` rather than `0.30000000000000004L`).
  3. **Zero Remainder Bid**: Ensures a team with exactly `0.25L` budget left can successfully place a bid of exactly `0.25L` without floating-point comparison errors.
  4. **Over-budget Prevention**: Validates that bidding increments exceeding the team's remaining budget are blocked.

---

## 2. Global E2E Configuration & Authentication (Playwright)
Located under: `e2e/` & Project Root

### 📄 [playwright.config.js](file:///c:/Projects/CricketAuction/playwright.config.js)
* **Purpose**: Orchestrates browsers, viewports, execution projects, and server re-usability.
* **Configurations**:
  * Auto-starts or reuses the local Vite dev server at `http://localhost:5173`.
  * Runs tests sequentially with `workers: 1` to prevent database race conditions.
  * Declares **three environments**:
    1. `desktop:host`: Desktop viewport (`1280x720`) using cached Host login.
    2. `mobile:host`: Mobile viewport (`390x844` Pixel 5 simulation) using cached Host login.
    3. `desktop:cohost`: Desktop viewport using cached Co-Host login.

### 📄 [auth.setup.js](file:///c:/Projects/CricketAuction/e2e/auth.setup.js)
* **Purpose**: Global setup that runs before any test specs. Logs in and caches browser cookies/localStorage to speed up execution.
* **Operations**:
  1. Checks if the **Host** user (`riteshman30@gmail.com`) exists in the database (signs up if missing), authenticates, selects/creates a live auction ("E2E Test League"), and caches authentication state to `playwright/.auth/host.json`.
  2. Checks if the **Co-Host** user (`sunflowersinha000_e2e@gmail.com`) exists, logs in, joins the auction, and caches state to `playwright/.auth/cohost.json`.
  3. Inserts mock start-up records (teams and players) if the auction dashboard is empty to guarantee correct page loading.

---

## 3. End-to-End Test Modules (Playwright)
Located under: `e2e/`

### 📄 [landing.spec.js](file:///c:/Projects/CricketAuction/e2e/landing.spec.js)
* **Purpose**: Tests public landing page rendering and initial routing.
* **Key Scenarios Tested**:
  * Checks that the cinematic landing page loads successfully with its typography, features list, and white header titles.
  * Asserts the "Start for Free" call-to-action button is visible and routes the user correctly to `/login`.

### 📄 [teams.spec.js](file:///c:/Projects/CricketAuction/e2e/teams.spec.js)
* **Purpose**: Tests creating, managing, and deleting teams.
* **Key Scenarios Tested**:
  * **Dashboard Stats**: Verifies that metrics cards display the right values (e.g. Total Teams, Total Purse) with correct inline icons.
  * **Team Creation**: Clicks "+ ADD TEAM", fills out the form (name, starting budget, max players, color swatches), and submits.
  * **Strict Check & Clean-up**: Validates navigating to individual team pages, and deletes the created team at the end to clean the database.

### 📄 [players.spec.js](file:///c:/Projects/CricketAuction/e2e/players.spec.js)
* **Purpose**: Tests player registration, styling selection, searching, and editing.
* **Key Scenarios Tested**:
  * **Add Player Form**: Fills in details (Name: "E2E Batter", Age, Matches, Style selection like "Right-hand bat", Base Price, Role: "Batter") and submits.
  * **Search Query**: Asserts the search text-input filters the roster and finds the added player.
  * **Mobile Layout check**: Ensures that viewport overflow does not allow horizontal swipe/scroll.
  * **Modification & Cleanup**: Edits player attributes, verifies back-button routing, and deletes the player from the profile card.

### 📄 [auction.spec.js](file:///c:/Projects/CricketAuction/e2e/auction.spec.js)
* **Purpose**: Tests the live bidding screen interaction and wheel physics.
* **Key Scenarios Tested**:
  * **Live Indicators**: Asserts the presence of a blinking centered Live Auction badge and sponsor strip.
  * **Spin Wheel**: Clicks the Canvas element center to simulate a wheel spin, waits for rotation to stop, and confirms the Bidding Modal overlay displays.
  * **Bidding Increments**: Verifies clicking the bid button updates values correctly.
  * **Close/Cancel Overlay**: Clicks the '✕' close button, verifying it closes cleanly and returns control to the spin wheel screen.

### 📄 [rankings.spec.js](file:///c:/Projects/CricketAuction/e2e/rankings.spec.js)
* **Purpose**: Tests the rankings leaderboard.
* **Key Scenarios Tested**:
  * Reads the active auction ID dynamically from cached credentials to seed a mock sold player and team.
  * Checks that the `/rankings` page correctly hides the generic auction top stats bar.
  * Verifies that the table header contains the exact column fields: **Rank**, **Player**, **Team**, and **Final Bid**.
  * Performs database cleanups upon completion using `afterAll` hooks.

### 📄 [cohost.spec.js](file:///c:/Projects/CricketAuction/e2e/cohost.spec.js)
* **Purpose**: Validates view-only permissions for guest and co-host logins.
* **Key Scenarios Tested**:
  * Navigates the co-host session through `/auction`, `/teams`, and `/players`.
  * Verifies that co-hosts can inspect details but **cannot** see or click buttons like "+ ADD TEAM", "+ ADD player", "Edit", or "Delete".

### 📄 [logout.spec.js](file:///c:/Projects/CricketAuction/e2e/logout.spec.js)
* **Purpose**: Tests user session termination.
* **Key Scenarios Tested**:
  * Opens the top navbar slide-out menu.
  * Clicks the "Log Out" link, verifying it clears session cache, invalidates the auth tokens, and redirects back to `/`.

### 📄 [auctionFlow.spec.js](file:///c:/Projects/CricketAuction/e2e/auctionFlow.spec.js)
* **Purpose**: Tests the complete lifecycle of a live auction (create, setup, spin, bidding transaction, purse deduction, rankings leaderboard, reset, and delete).
* **Key Scenarios Tested**:
  * **Dynamic Auction Setup**: Creates a temporary auction so as to not pollute standard E2E caching. Registers a mock team (with ₹100L purse) and a mock player (with ₹1.0L base price).
  * **Spin and Bid Flow**: Initiates a wheel spin to draw the mock player, selects the mock team, registers the bid, and clicks **SOLD!**.
  * **Purse & Leaderboard verification**: Navigates to `/teams` to verify that the team's remaining budget has correctly decremented to ₹99.0L, and checks that the player appears on the `/rankings` leaderboard.
  * **Reset Action**: Navigates to the side menu, accepts the confirm prompt, and clicks **Reset Auction Data**. Asserts that the team's purse is restored back to ₹100.0L, the player is removed from the roster, and the rankings board returns to its empty state.
  * **Delete Action**: Triggers **Delete Auction** from the side menu and accepts the confirmation, verifying that the auction is completely deleted.

---

## 4. Run commands

Run these anytime in your terminal:
* **Run unit tests**: `npm run test`
* **Run E2E browser tests**: `npm run test:e2e`
