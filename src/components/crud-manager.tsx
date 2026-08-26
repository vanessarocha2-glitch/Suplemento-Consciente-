'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyPanel, FilterSortRow, GhostAction, PanelHeader } from './admin/panel-parts'

export type FieldDef = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
}

export type ActionResult = { error: string | null }

type Row = Record<string, unknown> & { id: string }

type Props = {
  title: string
  rows: Row[]
  fields: FieldDef[]
  columns: { key: string; label: string }[]
  saveAction: (formData: FormData) => Promise<ActionResult>
  deleteAction: (formData: FormData) => Promise<ActionResult>
  createLabel?: string
  countLabel?: string
  emptyTitle?: string
  emptyText?: string
}

export function CrudManager({
  title,
  rows,
  fields,
  columns,
  saveAction,
  deleteAction,
  createLabel = 'Novo',
  countLabel,
  emptyTitle = 'Nenhum registro cadastrado',
  emptyText = 'Cadastre o primeiro registro para começar.',
}: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [filter, setFilter] = useState('')
  const [sortAsc, setSortAsc] = useState(true)

  // Filtro e ordenação sempre pela primeira coluna (nome/título), que é a
  // coluna principal de todas as telas de cadastro.
  const firstKey = columns[0].key
  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const filtered = needle
      ? rows.filter((row) =>
          String(row[firstKey] ?? '').toLowerCase().includes(needle)
        )
      : rows

    return [...filtered].sort((a, b) => {
      const cmp = String(a[firstKey] ?? '').localeCompare(String(b[firstKey] ?? ''))
      return sortAsc ? cmp : -cmp
    })
  }, [rows, firstKey, filter, sortAsc])

  const derivedCountLabel =
    countLabel ?? `${rows.length} ${rows.length === 1 ? 'registro cadastrado' : 'registros cadastrados'}`

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(row: Row) {
    setEditing(row)
    setOpen(true)
  }

  async function handleSave(formData: FormData) {
    const result = await saveAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Salvo com sucesso')
    setOpen(false)
  }

  async function handleDelete(id: string) {
    const formData = new FormData()
    formData.set('id', id)
    const result = await deleteAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Excluído com sucesso')
  }

  return (
    <div className="space-y-5">
      <PanelHeader
        title={title}
        countLabel={derivedCountLabel}
        createLabel={createLabel}
        onCreate={openCreate}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-5 rounded-[28px] p-8">
          <DialogHeader className="gap-0 text-left">
            <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
              Cadastros / {title}
            </span>
            <DialogTitle className="mt-2 font-heading text-2xl font-normal tracking-tight">
              {editing ? 'Editar' : createLabel}
            </DialogTitle>
          </DialogHeader>

          {/* key força o React a recriar o form ao trocar de registro,
              senão os defaultValue não atualizam */}
          <form
            key={editing?.id ?? 'new'}
            action={handleSave}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}

            {fields.map((field) => {
              const defaultValue = String(editing?.[field.name] ?? '')

              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>

                  {field.type === 'textarea' && (
                    <Textarea
                      id={field.name}
                      name={field.name}
                      defaultValue={defaultValue}
                      required={field.required}
                      className="min-h-[110px] rounded-[24px] bg-card"
                    />
                  )}

                  {field.type === 'text' && (
                    <Input
                      id={field.name}
                      name={field.name}
                      defaultValue={defaultValue}
                      required={field.required}
                    />
                  )}

                  {field.type === 'select' && (
                    <Select name={field.name} defaultValue={defaultValue}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )
            })}

            <div className="flex gap-2.5 pt-3">
              <Button type="submit" className="px-7">
                Salvar
              </Button>
              <DialogClose asChild>
                <Button variant="secondary">Cancelar</Button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {rows.length === 0 ? (
        <EmptyPanel
          kicker={`Cadastros / ${title}`}
          title={emptyTitle}
          description={emptyText}
          actionLabel={createLabel}
          onAction={openCreate}
        />
      ) : (
        <>
          <FilterSortRow
            value={filter}
            onChange={setFilter}
            sortAsc={sortAsc}
            onToggleSort={() => setSortAsc((asc) => !asc)}
          />

          <div className="overflow-x-auto rounded-[22px] bg-card p-2 shadow-sm">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-[220px] py-2.5 pl-4 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {columns[0].label}
                  </th>
                  {columns.slice(1).map((column) => (
                    <th
                      key={column.key}
                      className="py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="w-[150px] py-2.5 pr-4 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border/60 transition-colors hover:bg-[var(--color-neutral-100)]"
                  >
                    <td className="truncate py-3 pr-2 pl-4 font-semibold">
                      {String(row[columns[0].key] ?? '—')}
                    </td>
                    {columns.slice(1).map((column) => (
                      <td
                        key={column.key}
                        className="truncate py-3 pr-2 text-muted-foreground"
                      >
                        {String(row[column.key] ?? '—')}
                      </td>
                    ))}
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      <GhostAction onClick={() => openEdit(row)}>Editar</GhostAction>
                      <GhostAction onClick={() => handleDelete(row.id)}>
                        Excluir
                      </GhostAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
