import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xorsnqdyzbbkijwfyibo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcnNucWR5emJia2lqd2Z5aWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTcwOTIsImV4cCI6MjA5NTM3MzA5Mn0.du4bcio8n9u2AIOql2A_4NQtuTa8p2REWUeSnEQf6fs'

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
