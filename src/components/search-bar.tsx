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
    <form action={submit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        name="q"
        placeholder="Buscar suplemento pelo nome"
        defaultValue={searchParams.get('q') ?? ''}
        className="flex-1"
      />

      <Select name="brand" defaultValue={searchParams.get('brand') ?? 'all'}>
        <SelectTrigger className="sm:w-56">
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

      <Button type="submit">Buscar</Button>
    </form>
  )
}
