import type { AnvisaStatus } from '@/lib/types'

const statusLabels: Record<AnvisaStatus, string> = {
  approved: 'Regularizado na Anvisa',
  pending: 'Em análise na Anvisa',
  not_found: 'Registro não localizado',
}

const statusStyles: Record<AnvisaStatus, string> = {
  approved: 'bg-[var(--color-accent-2-100)] text-[var(--color-accent-2-800)]',
  pending: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)]',
  not_found: 'bg-[var(--color-accent-100)] text-[var(--color-accent-800)]',
}

const dotStyles: Record<AnvisaStatus, string> = {
  approved: 'bg-[var(--color-accent-2-600)]',
  pending: 'bg-[var(--color-neutral-500)]',
  not_found: 'bg-[var(--color-accent-600)]',
}

export function StatusTag({
  status,
  suffix,
  className = '',
}: {
  status: AnvisaStatus
  suffix?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-wide ${statusStyles[status]} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dotStyles[status]}`} />
      {statusLabels[status]}
      {suffix ? ` ${suffix}` : ''}
    </span>
  )
}
