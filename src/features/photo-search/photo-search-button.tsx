// src/features/photo-search/photo-search-button.tsx
'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { readLabelText } from './ocr'
import { buildQueryFromLabel, type CatalogEntry } from './match'

export function PhotoSearchButton({ catalog }: { catalog: CatalogEntry[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setReading(true)
    try {
      const text = await readLabelText(file)
      const { q, brandId } = buildQueryFromLabel(text, catalog)
      const params = new URLSearchParams({ q })
      if (brandId) params.set('brand', brandId)
      router.push(`/?${params.toString()}`)
    } catch {
      toast.error('Não foi possível ler a foto. Tente novamente.')
    } finally {
      setReading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Buscar por foto do rótulo"
        disabled={reading}
        onClick={() => inputRef.current?.click()}
      >
        {reading ? <Loader2 className="animate-spin" /> : <Camera />}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="photo-search-input"
        className="hidden"
        onChange={handleFile}
      />
    </>
  )
}
