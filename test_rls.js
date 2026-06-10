import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('c:\\Projects\\CricketAuction\\.env', 'utf8')
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1]
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(envUrl, envKey)

async function test() {
  // Let's use anon key but we need to see what's visible
  // If we don't have service_role, we can't query pg_policies easily without postgres role.
  // Wait, let's login with some user email/password if we knew it.
  console.log('Skipping pg_policies fetch without admin privileges.')
}
test()
