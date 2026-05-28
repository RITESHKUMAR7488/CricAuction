import { supabase } from './supabase'

export async function setupDatabase() {
  // Check if settings table exists by querying it
  const { error } = await supabase.from('settings').select('id').limit(1)
  
  if (error && error.code === '42P01') {
    // Table doesn't exist - user needs to run SQL schema
    return { needsSetup: true }
  }
  
  return { needsSetup: false }
}
