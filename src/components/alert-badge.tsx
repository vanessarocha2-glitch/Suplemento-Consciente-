import { Badge } from '@/components/ui/badge'
import type { Alert, AlertSeverity } from '@/lib/types'

const labels: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warning: 'Atenção',
  danger: 'Grave',
}

const variants: Record<AlertSeverity, 'secondary' | 'outline' | 'destructive'> = {
  info: 'secondary',
  warning: 'outline',
  danger: 'destructive',
}

export function severityLabel(severity: AlertSeverity): string {
  return labels[severity]
}

export function AlertBadge({ alert }: { alert: Alert }) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{alert.title}</h3>
        <Badge variant={variants[alert.severity]}>{labels[alert.severity]}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
    </div>
  )
}
