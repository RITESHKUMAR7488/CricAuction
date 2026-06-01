import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

async function seedRankingsData() {
  try {
    const envContent = fs.readFileSync('./.env', 'utf8')
    const env = {}
    envContent.split(/\r?\n/).forEach(line => {
      const parts = line.split('=')
      if (parts.length >= 2) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key) env[key] = val
      }
    })
    
    const url = env['VITE_SUPABASE_URL']
    const key = env['VITE_SUPABASE_ANON_KEY']
    
    if (url && key) {
      const supabase = createClient(url, key)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'riteshman30@gmail.com',
        password: 'tans@2304'
      })
      if (!authError && authData?.user) {
        // Read auction ID from host.json cache
        let auctionId;
        try {
          const state = JSON.parse(fs.readFileSync('playwright/.auth/host.json', 'utf8'));
          const storage = state.origins[0].localStorage;
          const auctionItem = storage.find(item => item.name.startsWith('active_auction_'));
          auctionId = auctionItem.value;
          // If double-quoted in JSON file, parse it out
          if (auctionId.startsWith('"') && auctionId.endsWith('"')) {
            auctionId = JSON.parse(auctionId);
          }
        } catch (e) {
          console.log(`⚠️ Reading host.json failed, falling back to latest auction: ${e.message}`);
        }

        if (!auctionId) {
          const { data: auctions } = await supabase
            .from('auctions')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
          if (auctions && auctions.length > 0) {
            auctionId = auctions[0].id
          }
        }

        if (auctionId) {
          // Check if mock team already exists to avoid redundant inserts
          let teamId;
          const { data: existingTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('auction_id', auctionId)
            .eq('name', 'E2E Rankings Team')
            .limit(1);

          if (existingTeams && existingTeams.length > 0) {
            teamId = existingTeams[0].id;
          } else {
            const { data: team } = await supabase.from('teams').insert({
              auction_id: auctionId,
              name: 'E2E Rankings Team',
              total_purse: 100,
              max_players: 10,
              color: '#4a9eff'
            }).select().single()
            if (team) {
              teamId = team.id;
            }
          }

          if (teamId) {
            // Check if mock player already exists to avoid duplicate constraint errors
            const { data: existingPlayers } = await supabase
              .from('players')
              .select('id')
              .eq('auction_id', auctionId)
              .eq('code', 'RANK-SOLD')
              .limit(1);

            if (!existingPlayers || existingPlayers.length === 0) {
              await supabase.from('players').insert({
                auction_id: auctionId,
                code: 'RANK-SOLD',
                name: 'E2E Rankings Sold Player',
                role: 'Batter',
                base_price: 2,
                sold_price: 15.5,
                status: 'sold',
                team_id: teamId
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(`⚠️ Rankings seeding error: ${err.message}`)
  }
}

test.describe('Rankings Stats & Table Column Headers E2E', () => {
  test.afterAll(async () => {
    try {
      const envContent = fs.readFileSync('./.env', 'utf8')
      const env = {}
      envContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          const val = parts.slice(1).join('=').trim()
          if (key) env[key] = val
        }
      })
      
      const url = env['VITE_SUPABASE_URL']
      const key = env['VITE_SUPABASE_ANON_KEY']
      
      if (url && key) {
        const supabase = createClient(url, key)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: 'riteshman30@gmail.com',
          password: 'tans@2304'
        })
        if (!authError && authData?.user) {
          let auctionId;
          try {
            const state = JSON.parse(fs.readFileSync('playwright/.auth/host.json', 'utf8'));
            const storage = state.origins[0].localStorage;
            const auctionItem = storage.find(item => item.name.startsWith('active_auction_'));
            auctionId = auctionItem.value;
            if (auctionId.startsWith('"') && auctionId.endsWith('"')) {
              auctionId = JSON.parse(auctionId);
            }
          } catch {}

          if (auctionId) {
            // Delete rankings sold player
            await supabase
              .from('players')
              .delete()
              .eq('auction_id', auctionId)
              .eq('code', 'RANK-SOLD');
            
            // Delete rankings team
            await supabase
              .from('teams')
              .delete()
              .eq('auction_id', auctionId)
              .eq('name', 'E2E Rankings Team');
          }
        }
      }
    } catch (err) {
      console.log(`⚠️ Rankings cleanup error: ${err.message}`)
    }
  })

  test('verifies stats metrics blocks are removed and table displays correct Rank Player Team and Final Bid columns', async ({ page }) => {
    // Seed Rankings data before navigating
    await seedRankingsData()

    // 1. Visit rankings dashboard page
    await page.goto('/rankings')
    await expect(page).toHaveURL(/\/rankings/)

    // 2. Verify Stats blocks are NOT visible (should not exist in DOM)
    const statsRow = page.locator('.stats-row')
    await expect(statsRow).not.toBeVisible()

    // 3. Verify Table Headers display exact requested column names
    const tableHeader = page.locator('.rankings-table-header')
    await expect(tableHeader).toBeVisible()

    // Check specific columns
    const columns = tableHeader.locator('span')
    await expect(columns.nth(0)).toContainText('Rank')
    await expect(columns.nth(1)).toContainText('Player')
    await expect(columns.nth(2)).toContainText('Team')
    await expect(columns.nth(3)).toContainText('Final Bid')
  })
})
