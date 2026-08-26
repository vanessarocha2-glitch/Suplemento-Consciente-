import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const sections = [
  { href: '/admin/brands', table: 'categories', label: 'Marcas' },
  { href: '/admin/ingredients', table: 'ingredients', label: 'Ingredientes' },
  { href: '/admin/alerts', table: 'alerts', label: 'Alertas' },
  { href: '/admin/supplements', table: 'supplements', label: 'Suplementos' },
  { href: '/admin/videos', table: 'videos', label: 'Vídeos' },
  { href: '/admin/quiz', table: 'quiz_questions', label: 'Perguntas do quiz' },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()

  const counts = await Promise.all(
    sections.map(async (section) => {
      const { count } = await supabase
        .from(section.table)
        .select('*', { count: 'exact', head: true })
      return count ?? 0
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
          Painel
        </span>
        <h1 className="mt-1 text-4xl tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, index) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-[22px] bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="font-heading text-4xl">{counts[index]}</span>
            <p className="mt-1 text-sm text-muted-foreground">{section.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
