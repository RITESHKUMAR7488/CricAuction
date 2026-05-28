import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Upload a file to Supabase Storage and return its public URL
export async function uploadFile(file, folder = 'general') {
  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('cricket-auction')
    .upload(fileName, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('cricket-auction').getPublicUrl(fileName)
  return data.publicUrl
}
