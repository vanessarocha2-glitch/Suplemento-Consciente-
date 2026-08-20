'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  Alert,
  Category,
  Ingredient,
  LegislationClaim,
  SupplementDetail,
} from '@/lib/types'
import type { ActionResult } from '@/components/crud-manager'

type Props = {
  brands: Category[]
  ingredients: Ingredient[]
  alerts: Alert[]
  saveAction: (formData: FormData) => Promise<ActionResult>
  onSaved: () => void
  supplement?: SupplementDetail | null
}

export function SupplementForm({
  brands,
  ingredients,
  alerts,
  saveAction,
  onSaved,
  supplement,
}: Props) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(
    () => supplement?.ingredients.map((ingredient) => ingredient.id) ?? []
  )
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>(
    () => supplement?.alerts.map((alert) => alert.id) ?? []
  )
  const [claims, setClaims] = useState<LegislationClaim[]>(
    () => supplement?.legislation_info ?? []
  )

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  function addClaim() {
    setClaims([...claims, { claim: '', compliant: true, note: '' }])
  }

  function updateClaim(index: number, patch: Partial<LegislationClaim>) {
    setClaims(claims.map((claim, i) => (i === index ? { ...claim, ...patch } : claim)))
  }

  function removeClaim(index: number) {
    setClaims(claims.filter((_, i) => i !== index))
  }

  async function handleSubmit(formData: FormData) {
    formData.set('ingredient_ids', JSON.stringify(selectedIngredients))
    formData.set('alert_ids', JSON.stringify(selectedAlerts))
    formData.set(
      'legislation_info',
      JSON.stringify(claims.filter((claim) => claim.claim.trim() !== ''))
    )

    const result = await saveAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Suplemento salvo')
    setSelectedIngredients([])
    setSelectedAlerts([])
    setClaims([])
    onSaved()
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {supplement && <input type="hidden" name="id" value={supplement.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do suplemento</Label>
          <Input id="name" name="name" defaultValue={supplement?.name ?? ''} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Marca</Label>
          <Select name="category_id" defaultValue={supplement?.category_id ?? ''}>
            <SelectTrigger id="category_id">
              <SelectValue placeholder="Selecione a marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Para que serve</Label>
        <Textarea
          id="purpose"
          name="purpose"
          defaultValue={supplement?.purpose ?? ''}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="usage_instructions">Como usar</Label>
        <Textarea
          id="usage_instructions"
          name="usage_instructions"
          defaultValue={supplement?.usage_instructions ?? ''}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="anvisa_status">Situação na Anvisa</Label>
          <Select name="anvisa_status" defaultValue={supplement?.anvisa_status ?? 'not_found'}>
            <SelectTrigger id="anvisa_status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Regularizado</SelectItem>
              <SelectItem value="pending">Em análise</SelectItem>
              <SelectItem value="not_found">Não localizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="anvisa_registration">Número de registro</Label>
          <Input
            id="anvisa_registration"
            name="anvisa_registration"
            defaultValue={supplement?.anvisa_registration ?? ''}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">URL da imagem</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          defaultValue={supplement?.image_url ?? ''}
        />
      </div>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Ingredientes</legend>
        {ingredients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Cadastre ingredientes antes de criar um suplemento.
          </p>
        )}
        {ingredients.map((ingredient) => {
          const checked = selectedIngredients.includes(ingredient.id)
          return (
            <div key={ingredient.id} className="flex items-center gap-3">
              <Checkbox
                id={`ing-${ingredient.id}`}
                checked={checked}
                onCheckedChange={() =>
                  setSelectedIngredients(toggle(selectedIngredients, ingredient.id))
                }
              />
              <Label htmlFor={`ing-${ingredient.id}`} className="flex-1">
                {ingredient.name}
              </Label>
              {checked && (
                <Input
                  name={`dosage_${ingredient.id}`}
                  placeholder="Dosagem (ex: 500mg)"
                  defaultValue={
                    supplement?.ingredients.find((item) => item.id === ingredient.id)
                      ?.dosage ?? ''
                  }
                  className="w-48"
                />
              )}
            </div>
          )
        })}
      </fieldset>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Alertas</legend>
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum alerta cadastrado.</p>
        )}
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center gap-3">
            <Checkbox
              id={`alert-${alert.id}`}
              checked={selectedAlerts.includes(alert.id)}
              onCheckedChange={() =>
                setSelectedAlerts(toggle(selectedAlerts, alert.id))
              }
            />
            <Label htmlFor={`alert-${alert.id}`}>{alert.title}</Label>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Conformidade legislativa</legend>

        {claims.map((claim, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <Input
              value={claim.claim}
              placeholder="Alegação do rótulo"
              onChange={(event) => updateClaim(index, { claim: event.target.value })}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id={`compliant-${index}`}
                checked={claim.compliant}
                onCheckedChange={(value) =>
                  updateClaim(index, { compliant: value === true })
                }
              />
              <Label htmlFor={`compliant-${index}`}>
                Está de acordo com a legislação
              </Label>
            </div>
            <Input
              value={claim.note}
              placeholder="Observação (ex: RDC 243/2018)"
              onChange={(event) => updateClaim(index, { note: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeClaim(index)}
            >
              Remover alegação
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addClaim}>
          Adicionar alegação
        </Button>
      </fieldset>

      <Button type="submit" className="w-full">
        Salvar suplemento
      </Button>
    </form>
  )
}
