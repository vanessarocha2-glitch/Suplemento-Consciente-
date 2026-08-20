'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { videoSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveVideo(formData: FormData): Promise<ActionResult> {
  const parsed = videoSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    video_url: formData.get('video_url'),
    supplement_id: formData.get('supplement_id'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('videos').update(parsed.data).eq('id', String(id))
    : await supabase.from('videos').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/videos')
  revalidatePath('/videos')
  return { error: null }
}

export async function deleteVideo(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/videos')
  revalidatePath('/videos')
  return { error: null }
}
