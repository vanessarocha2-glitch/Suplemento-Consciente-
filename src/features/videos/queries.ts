import { createClient } from '@/lib/supabase/server'
import type { Video } from '@/lib/types'

export async function listVideos(): Promise<Video[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao listar vídeos: ${error.message}`)
  return data ?? []
}
