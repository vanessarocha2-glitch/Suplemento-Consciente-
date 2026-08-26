'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category } from '@/lib/types'

export function SearchBar({ brands }: { brands: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function submit(formData: FormData) {
    const params = new URLSearchParams()
    const term = String(formData.get('q') ?? '').trim()
    const brand = String(formData.get('brand') ?? '')

    if (term) params.set('q', term)
    if (brand && brand !== 'all') params.set('brand', brand)

    router.push(params.toString() ? `/?${params}` : '/')
  }

  return (
    <form
      action={submit}
      className="flex flex-col gap-2 rounded-[28px] border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:gap-1"
    >
      <Input
        name="q"
        placeholder="Buscar suplemento pelo nome"
        defaultValue={searchParams.get('q') ?? ''}
        className="h-11 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />

      <span className="hidden h-[26px] w-px bg-border sm:block" />

      <Select name="brand" defaultValue={searchParams.get('brand') ?? 'all'}>
        <SelectTrigger className="h-11 border-0 bg-transparent shadow-none sm:w-auto">
          <SelectValue placeholder="Todas as marcas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" className="h-11 px-7">
        Buscar
      </Button>
    </form>
  )
}
