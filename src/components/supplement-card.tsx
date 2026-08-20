import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { SupplementListItem } from '@/lib/types'

const statusLabels: Record<string, string> = {
  approved: 'Regularizado na Anvisa',
  pending: 'Em análise na Anvisa',
  not_found: 'Registro não localizado',
}

export function SupplementCard({ supplement }: { supplement: SupplementListItem }) {
  return (
    <Link href={`/supplements/${supplement.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/30">
        <CardHeader>
          <CardTitle>{supplement.name}</CardTitle>
          <CardDescription>{supplement.category?.name ?? 'Sem marca'}</CardDescription>
          <Badge
            variant={supplement.anvisa_status === 'approved' ? 'default' : 'secondary'}
            className="mt-2 w-fit"
          >
            {statusLabels[supplement.anvisa_status]}
          </Badge>
        </CardHeader>
      </Card>
    </Link>
  )
}
