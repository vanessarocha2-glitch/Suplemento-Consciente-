'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/admin/login/actions'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/brands', label: 'Marcas' },
  { href: '/admin/ingredients', label: 'Ingredientes' },
  { href: '/admin/alerts', label: 'Alertas' },
  { href: '/admin/supplements', label: 'Suplementos' },
  { href: '/admin/videos', label: 'Vídeos' },
  { href: '/admin/quiz', label: 'Quiz' },
  { href: '/admin/comments', label: 'Comentários' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 flex h-screen w-[246px] shrink-0 flex-col gap-6 bg-card p-5">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-2.5 px-2 font-heading text-base"
      >
        <span className="block size-5 rounded-full bg-accent-2" />
        Suplemento Consciente
      </Link>

      <nav className="flex flex-col gap-0.5">
        <span className="px-3 pb-2 text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
          Painel
        </span>
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full px-3.5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-foreground hover:bg-foreground/7'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col items-start gap-2 px-1.5">
        <Link
          href="/"
          className="text-sm text-[var(--color-accent-700)] hover:underline"
        >
          Ver site público
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="cursor-pointer rounded-full border border-border px-4 py-2 font-heading text-sm transition-colors hover:bg-foreground/7"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
