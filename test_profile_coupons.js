import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('c:\\Projects\\CricketAuction\\.env', 'utf8')
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1]
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(envUrl, envKey)

async function test() {
  const { data: auc } = await supabase.from('auctions').select('id, host_id').limit(1).single()
  
  const { data: fc, error: fcErr } = await supabase.from('food_coupons').insert({
    auction_id: auc.id,
    created_by: auc.host_id,
    event_name: 'Test Event Name',
    meal_type: 'Lunch',
    coupon_date: new Date().toISOString()
  }).select().single()

  console.log('FC', fc, fcErr)

  // Find a valid player
  const { data: p } = await supabase.from('players').select('id, user_id, name').limit(1).single()

  const { data: rcp, error: rcpErr } = await supabase.from('coupon_recipients').insert({
    coupon_id: fc.id,
    user_id: p.user_id,
    player_id: p.id,
    player_name: p.name
  }).select().single()

  console.log('RCP', rcp, rcpErr)

  const { data, error } = await supabase
    .from('coupon_recipients')
    .select('*, food_coupons(event_name, meal_type, coupon_date, auction_id, auctions(name, logo_url))')
    .eq('id', rcp.id)

  console.log('--- JOIN RESULT ---')
  console.log(JSON.stringify({ data, error }, null, 2))
  
  // Cleanup
  await supabase.from('coupon_recipients').delete().eq('id', rcp.id)
  await supabase.from('food_coupons').delete().eq('id', fc.id)
}
test().catch(console.error)
