import type { Alert, AlertSeverity } from '@/lib/types'

const labels: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warning: 'Atenção',
  danger: 'Grave',
}

const cardStyles: Record<AlertSeverity, string> = {
  info: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)]',
  warning: 'bg-[var(--color-accent-2-100)] text-[var(--color-accent-2-900)]',
  danger: 'bg-[var(--color-accent-100)] text-[var(--color-accent-900)]',
}

const tagStyles: Record<AlertSeverity, string> = {
  info: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-800)]',
  warning: 'bg-[var(--color-accent-2-200)] text-[var(--color-accent-2-800)]',
  danger: 'bg-[var(--color-accent-200)] text-[var(--color-accent-800)]',
}

export function severityLabel(severity: AlertSeverity): string {
  return labels[severity]
}

export function AlertBadge({ alert }: { alert: Alert }) {
  return (
    <div className={`rounded-[16px] p-5 ${cardStyles[alert.severity]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-heading text-base">{alert.title}</span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] ${tagStyles[alert.severity]}`}
        >
          {labels[alert.severity]}
        </span>
      </div>
      <p className="mt-2 text-sm opacity-85">{alert.description}</p>
    </div>
  )
}
