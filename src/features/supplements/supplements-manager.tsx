'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SupplementForm } from './supplement-form'
import { getSupplementDetail } from './actions'
import type { ActionResult } from '@/components/crud-manager'
import type {
  Alert,
  Category,
  Ingredient,
  SupplementDetail,
  SupplementListItem,
} from '@/lib/types'

const statusLabels: Record<string, string> = {
  approved: 'Regularizado',
  pending: 'Em análise',
  not_found: 'Não localizado',
}

type Props = {
  supplements: SupplementListItem[]
  brands: Category[]
  ingredients: Ingredient[]
  alerts: Alert[]
  saveAction: (formData: FormData) => Promise<ActionResult>
  deleteAction: (formData: FormData) => Promise<ActionResult>
}

export function SupplementsManager({
  supplements,
  brands,
  ingredients,
  alerts,
  saveAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editingSupplement, setEditingSupplement] = useState<SupplementDetail | null>(
    null
  )
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  // Descarta respostas de openEdit() que não são mais a mais recente —
  // evita que um fetch lento reabra o dialog depois que o usuário já
  // fechou, clicou em "Novo suplemento" ou editou outra linha.
  const editRequestId = useRef(0)

  async function handleDelete(id: string) {
    const formData = new FormData()
    formData.set('id', id)
    const result = await deleteAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Suplemento excluído')
  }

  async function openEdit(id: string) {
    const requestId = ++editRequestId.current
    setLoadingEditId(id)

    try {
      const detail = await getSupplementDetail(id)
      if (requestId !== editRequestId.current) return // usuário já seguiu em frente

      if (!detail) {
        toast.error('Não foi possível carregar o suplemento')
        return
      }
      setEditingSupplement(detail)
      setOpen(true)
    } catch {
      if (requestId !== editRequestId.current) return
      toast.error('Falha ao carregar o suplemento. Tente novamente.')
    } finally {
      if (requestId === editRequestId.current) setLoadingEditId(null)
    }
  }

  function handleOpenChange(next: boolean) {
    editRequestId.current++
    setOpen(next)
    if (!next) setEditingSupplement(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suplementos</h1>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              disabled={brands.length === 0}
              onClick={() => {
                editRequestId.current++
                setEditingSupplement(null)
                setOpen(true)
              }}
            >
              Novo suplemento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplement ? 'Editar suplemento' : 'Novo suplemento'}
              </DialogTitle>
            </DialogHeader>
            <SupplementForm
              key={editingSupplement?.id ?? 'new'}
              brands={brands}
              ingredients={ingredients}
              alerts={alerts}
              saveAction={saveAction}
              supplement={editingSupplement}
              onSaved={() => {
                editRequestId.current++
                setOpen(false)
                setEditingSupplement(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {brands.length === 0 && (
        <p className="text-muted-foreground">
          Cadastre pelo menos uma marca antes de criar suplementos.
        </p>
      )}

      {supplements.length === 0 ? (
        <p className="text-muted-foreground">Nenhum suplemento cadastrado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Anvisa</TableHead>
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplements.map((supplement) => (
              <TableRow key={supplement.id}>
                <TableCell>{supplement.name}</TableCell>
                <TableCell>{supplement.category?.name ?? '—'}</TableCell>
                <TableCell>{statusLabels[supplement.anvisa_status]}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/supplements/${supplement.id}`}>Ver</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingEditId === supplement.id}
                    onClick={() => openEdit(supplement.id)}
                  >
                    {loadingEditId === supplement.id ? 'Carregando...' : 'Editar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(supplement.id)}
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
