import { test as setup, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

async function ensureUserExists(email, password) {
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
      console.log(`📡 Ensuring user account exists: ${email}...`)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        console.log(`ℹ️ Registration status for ${email}: ${error.message}`)
      } else {
        console.log(`✅ User registered successfully: ${email}`)
      }
    }
  } catch (err) {
    console.log(`⚠️ Pre-registration helper error: ${err.message}`)
  }
}

async function performLogin(page, email, password) {
  page.on('console', msg => console.log(`💻 BROWSER CONSOLE [${email}]: ${msg.text()}`))
  await page.goto('/login')
  await page.fill('input[placeholder="Email Address"]', email)
  await page.fill('input[placeholder="Password"]', password)
  await page.click('button[type="submit"]')
  
  // Wait to navigate to dashboard (allow 15s for redirection)
  try {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  } catch (err) {
    const toast = page.locator('.toast')
    if (await toast.count() > 0) {
      const toastText = await toast.allInnerTexts()
      console.error(`❌ Login failure toast message for ${email}: "${toastText.join(', ')}"`)
    } else {
      console.error(`❌ Login failed for ${email} without toast message. Current URL: ${page.url()}`)
    }
    throw err
  }
  
  // Wait for Supabase to fetch and render the auctions list
  await page.waitForTimeout(2000)

  // Select or create an active auction to guarantee dashboards mount successfully!
  const firstManageBtn = page.locator('button:has-text("Manage")').first()
  const watchLiveBtn = page.locator('button:has-text("Watch Live")').first()
  
  if (await firstManageBtn.isVisible()) {
    console.log(`🏟️ Activating hosted auction for ${email}...`)
    await firstManageBtn.click()
  } else if (await watchLiveBtn.isVisible()) {
    console.log(`🏟️ Activating joined auction for ${email}...`)
    await watchLiveBtn.click()
  } else {
    console.log(`🏟️ Creating fresh E2E Test League for ${email}...`)
    const createBtn = page.locator('text=+ Create New Auction')
    await expect(createBtn).toBeVisible()
    await createBtn.click()
    
    await page.fill('input[placeholder="Auction Name (e.g. IPL 2025)"]', 'E2E Test League')
    await page.click('button[type="submit"]')
  }

  // Confirm redirect back to root landing route, ensuring authentication and active auction are settled
  await page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
  
  // Log localStorage keys
  const keys = await page.evaluate(() => Object.keys(localStorage))
  console.log(`📡 LocalStorage keys at the end of performLogin for ${email}:`, keys)

  // WAIT for Supabase client to asynchronously write session tokens to LocalStorage
  await page.waitForTimeout(2000)
}

async function joinAuctionProgrammatically(email, password) {
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (!authError && authData?.user) {
        const uid = authData.user.id
        const { data: auctions, error: selectErr } = await supabase
          .from('auctions')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(1)
        if (!selectErr && auctions && auctions.length > 0) {
          const auctionId = auctions[0].id
          console.log(`📡 Programmatically joining ${email} to latest auction: ${auctions[0].name} (${auctionId})...`)
          const { error: joinErr } = await supabase
            .from('auction_members')
            .insert({ auction_id: auctionId, user_id: uid })
          if (joinErr) {
            console.log(`ℹ️ Join status: ${joinErr.message}`)
          } else {
            console.log(`✅ Joined successfully!`)
          }
        }
      }
    }
  } catch (err) {
    console.log(`⚠️ Join helper error: ${err.message}`)
  }
}

async function seedMockDataIfEmpty(email, password) {
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (!authError && authData?.user) {
        const { data: auctions, error: selectErr } = await supabase
          .from('auctions')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(1)
        if (!selectErr && auctions && auctions.length > 0) {
          const auctionId = auctions[0].id
          
          let teamId;
          const { data: teams, error: teamsErr } = await supabase
            .from('teams')
            .select('id')
            .eq('auction_id', auctionId)
          if (!teamsErr && teams && teams.length > 0) {
            teamId = teams[0].id
          } else {
            console.log(`🌱 Seeding mock team for auction ${auctions[0].name}...`)
            const { data: insertedTeam } = await supabase.from('teams').insert({
              auction_id: auctionId,
              name: 'E2E Mock Team',
              total_purse: 100,
              max_players: 10,
              color: '#4a9eff'
            }).select().single()
            if (insertedTeam) teamId = insertedTeam.id
          }

          const { data: availPlayers, error: availErr } = await supabase
            .from('players')
            .select('id')
            .eq('auction_id', auctionId)
            .eq('status', 'available')
          if (!availErr && (!availPlayers || availPlayers.length === 0)) {
            console.log(`🌱 Seeding mock available player for auction ${auctions[0].name}...`)
            await supabase.from('players').insert({
              auction_id: auctionId,
              code: 'MOCK-PLAY',
              name: 'E2E Mock Player',
              role: 'Batter',
              base_price: 1,
              status: 'available'
            })
          }

          const { data: soldPlayers, error: soldErr } = await supabase
            .from('players')
            .select('id')
            .eq('auction_id', auctionId)
            .eq('status', 'sold')
          if (!soldErr && (!soldPlayers || soldPlayers.length === 0)) {
            console.log(`🌱 Seeding mock sold player for auction ${auctions[0].name}...`)
            await supabase.from('players').insert({
              auction_id: auctionId,
              code: 'SOLD-LEG',
              name: 'E2E Sold Legend',
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
  } catch (err) {
    console.log(`⚠️ Seeding error: ${err.message}`)
  }
}

setup('authenticate users and cache sessions', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name
  
  if (projectName === 'setup:host') {
    await ensureUserExists('riteshman30@gmail.com', 'tans@2304')
    console.log('🔑 Authenticating Host session...')
    await performLogin(page, 'riteshman30@gmail.com', 'tans@2304')
    await seedMockDataIfEmpty('riteshman30@gmail.com', 'tans@2304')
    console.log('✅ Host session authenticated successfully!')
    await page.context().storageState({ path: 'playwright/.auth/host.json' })
  } else if (projectName === 'setup:cohost') {
    let email = 'sunflowersinha000@gmail.com'
    const password = 'tans@2304'
    let canLogin = false

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
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error) {
          canLogin = true
        }
      }
    } catch (e) {
      console.log(`⚠️ Login check error: ${e.message}`)
    }

    if (!canLogin) {
      console.log(`⚠️ Credential sunflowersinha000@gmail.com cannot log in (password mismatch or unconfirmed email on this database). Using self-healing fallback cohost email sunflowersinha000_e2e@gmail.com...`)
      email = 'sunflowersinha000_e2e@gmail.com'
    }

    await ensureUserExists(email, password)
    await joinAuctionProgrammatically(email, password)
    console.log(`🔑 Authenticating Co-Host session as ${email}...`)
    await performLogin(page, email, password)
    console.log('✅ Co-Host session authenticated successfully!')
    await page.context().storageState({ path: 'playwright/.auth/cohost.json' })
  }
})
