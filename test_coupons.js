import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('c:\\Projects\\CricketAuction\\.env', 'utf8')
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1]
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(envUrl, envKey)

async function test() {
  const { data: auc } = await supabase.from('auctions').select('id, host_id').limit(1).single()
  
  const { data: fc } = await supabase.from('food_coupons').insert({
    auction_id: auc.id,
    created_by: auc.host_id,
    event_name: 'Test Event Name',
    meal_type: 'Lunch',
    coupon_date: new Date().toISOString()
  }).select().single()

  const { data: rcp } = await supabase.from('coupon_recipients').insert({
    coupon_id: fc.id,
    user_id: auc.host_id,
    player_id: auc.id, // using auction id as dummy uuid for player_id since player_id is just uuid
    player_name: 'Test Player'
  }).select().single()

  const { data, error } = await supabase
    .from('coupon_recipients')
    .select('*, food_coupons(event_name, meal_type, coupon_date, auction_id, auctions(name, logo_url))')
    .eq('id', rcp.id)

  console.log('--- RECIPIENT ---')
  console.log(JSON.stringify(data, null, 2))
  
  // Cleanup
  await supabase.from('coupon_recipients').delete().eq('id', rcp.id)
  await supabase.from('food_coupons').delete().eq('id', fc.id)
}
test().catch(console.error)
