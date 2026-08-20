'use client'

import { useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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
}

export function CrudManager({
  title,
  rows,
  fields,
  columns,
  saveAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Novo</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Novo'}</DialogTitle>
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

              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhum registro cadastrado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {String(row[column.key] ?? '—')}
                  </TableCell>
                ))}
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(row.id)}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
