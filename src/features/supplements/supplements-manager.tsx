'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusTag } from '@/components/status-tag'
import {
  EmptyPanel,
  FilterSortRow,
  GhostAction,
  PanelHeader,
} from '@/components/admin/panel-parts'
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
  const [filter, setFilter] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  // Descarta respostas de openEdit() que não são mais a mais recente —
  // evita que um fetch lento reabra o dialog depois que o usuário já
  // fechou, clicou em "Novo suplemento" ou editou outra linha.
  const editRequestId = useRef(0)

  const visibleSupplements = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const filtered = needle
      ? supplements.filter((supplement) =>
          supplement.name.toLowerCase().includes(needle)
        )
      : supplements

    return [...filtered].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name)
      return sortAsc ? cmp : -cmp
    })
  }, [supplements, filter, sortAsc])

  const countLabel = `${supplements.length} ${
    supplements.length === 1 ? 'suplemento cadastrado' : 'suplementos cadastrados'
  }`

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

  function openCreate() {
    editRequestId.current++
    setEditingSupplement(null)
    setOpen(true)
  }

  return (
    <div className="space-y-5">
      <PanelHeader
        title="Suplementos"
        countLabel={countLabel}
        createLabel="Novo suplemento"
        onCreate={openCreate}
        createDisabled={brands.length === 0}
      />

      {brands.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Cadastre pelo menos uma marca antes de criar suplementos.
        </p>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl gap-5 overflow-y-auto rounded-[28px] p-8">
          <DialogHeader className="gap-0 text-left">
            <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
              Cadastros / Suplementos
            </span>
            <DialogTitle className="mt-2 font-heading text-2xl font-normal tracking-tight">
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
            footer={
              <>
                <Button type="submit" className="px-7">
                  Salvar suplemento
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </DialogClose>
              </>
            }
          />
        </DialogContent>
      </Dialog>

      {supplements.length === 0 ? (
        <EmptyPanel
          kicker="Cadastros / Suplementos"
          title="Nenhum suplemento cadastrado"
          description="Cadastre o primeiro suplemento para publicá-lo na consulta pública."
          actionLabel="Novo suplemento"
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
                  <th className="w-[260px] py-2.5 pl-4 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    Nome
                  </th>
                  <th className="w-[180px] py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    Marca
                  </th>
                  <th className="py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    Anvisa
                  </th>
                  <th className="w-[190px] py-2.5 pr-4 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleSupplements.map((supplement) => (
                  <tr
                    key={supplement.id}
                    className="border-t border-border/60 transition-colors hover:bg-[var(--color-neutral-100)]"
                  >
                    <td className="truncate py-3 pr-2 pl-4 font-semibold">
                      {supplement.name}
                    </td>
                    <td className="truncate py-3 pr-2 text-muted-foreground">
                      {supplement.category?.name ?? '—'}
                    </td>
                    <td className="py-3 pr-2">
                      <StatusTag status={supplement.anvisa_status} />
                    </td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      <Link
                        href={`/supplements/${supplement.id}`}
                        className="mr-1 inline-block cursor-pointer rounded-full px-3 py-1.5 font-heading text-sm text-primary transition-colors hover:bg-primary/10"
                      >
                        Ver
                      </Link>
                      <GhostAction
                        disabled={loadingEditId === supplement.id}
                        onClick={() => openEdit(supplement.id)}
                      >
                        {loadingEditId === supplement.id ? 'Carregando…' : 'Editar'}
                      </GhostAction>
                      <GhostAction onClick={() => handleDelete(supplement.id)}>
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
