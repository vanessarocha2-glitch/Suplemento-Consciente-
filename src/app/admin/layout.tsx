import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from './login/actions'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/brands', label: 'Marcas' },
  { href: '/admin/ingredients', label: 'Ingredientes' },
  { href: '/admin/alerts', label: 'Alertas' },
  { href: '/admin/supplements', label: 'Suplementos' },
  { href: '/admin/videos', label: 'Vídeos' },
  { href: '/admin/quiz', label: 'Quiz' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // A página de login usa este layout mas não tem sessão ainda.
  if (!user) return <>{children}</>

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 p-4">
          <span className="font-semibold">Suplemento Consciente</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="ml-auto">
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  )
}
