'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { GhostAction } from '@/components/admin/panel-parts'
import type { AdminComment } from '@/features/comments/queries'
import { deleteComment } from '@/features/comments/actions'

export function CommentsTable({ comments }: { comments: AdminComment[] }) {
  const [rows, setRows] = useState(comments)
  const [, startTransition] = useTransition()

  function handleDelete(id: string) {
    const formData = new FormData()
    formData.set('id', id)

    startTransition(async () => {
      const result = await deleteComment(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRows((current) => current.filter((row) => row.id !== id))
      toast.success('Excluído com sucesso')
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
          Cadastros
        </span>
        <h1 className="mt-1 mb-0.5 text-4xl tracking-tight">Comentários</h1>
        <span className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'comentário' : 'comentários'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[22px] bg-card p-8 text-center text-muted-foreground">
          Nenhum comentário ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] bg-card p-2 shadow-sm">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-[200px] py-2.5 pl-4 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Suplemento
                </th>
                <th className="w-[140px] py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Apelido
                </th>
                <th className="w-[80px] py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Nota
                </th>
                <th className="py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Comentário
                </th>
                <th className="w-[110px] py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Data
                </th>
                <th className="w-[100px] py-2.5 pr-4 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border/60 transition-colors hover:bg-[var(--color-neutral-100)]"
                >
                  <td className="truncate py-3 pr-2 pl-4 font-semibold">
                    {row.supplement_name}
                  </td>
                  <td className="truncate py-3 pr-2 text-muted-foreground">
                    {row.author_name}
                  </td>
                  <td className="py-3 pr-2 text-muted-foreground">
                    {row.rating}/5
                  </td>
                  <td className="truncate py-3 pr-2 text-muted-foreground" title={row.comment_text}>
                    {row.comment_text}
                  </td>
                  <td className="py-3 pr-2 text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    <GhostAction onClick={() => handleDelete(row.id)}>
                      Excluir
                    </GhostAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
