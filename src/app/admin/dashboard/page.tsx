import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, index) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:border-foreground/30">
              <CardHeader>
                <CardTitle className="text-3xl">{counts[index]}</CardTitle>
                <CardDescription>{section.label}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
