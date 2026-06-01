import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envPath = './.env'

console.log('==================================================')
console.log('⚡  SUPABASE SCHEMAS & CONNECTIVITY TESTER  ⚡')
console.log('==================================================')

if (!fs.existsSync(envPath)) {
  console.error(`❌ Error: .env file not found at: ${envPath}`)
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
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

if (!url || !key) {
  console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env!')
  process.exit(1)
}

console.log(`🔗 Endpoint: ${url}`)
console.log('⏳ Connecting to Supabase Client...')

const supabase = createClient(url, key)

const tables = ['settings', 'auctions', 'teams', 'players', 'sponsors', 'owners']

async function runTest() {
  console.log('\n🔍 Inspecting Database Schemas & Row Counts:\n')
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ Table "${table}": MISSING (Schema setup required)`)
        } else {
          console.log(`❌ Table "${table}": ERROR - [${error.code}] ${error.message}`)
        }
      } else {
        console.log(`✅ Table "${table}": ACTIVE (Contains ${count} rows)`)
      }
    } catch (e) {
      console.log(`❌ Table "${table}": FAIL - ${e.message}`)
    }
  }
  console.log('\n==================================================')
}

runTest()
