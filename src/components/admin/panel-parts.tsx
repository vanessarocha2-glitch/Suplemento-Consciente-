import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Cabeçalho das telas de cadastro: kicker, título, contagem e ação de criar. */
export function PanelHeader({
  title,
  countLabel,
  createLabel,
  onCreate,
  createDisabled,
}: {
  title: string
  countLabel: string
  createLabel: string
  onCreate: () => void
  createDisabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
          Cadastros
        </span>
        <h1 className="mt-1 mb-0.5 text-4xl tracking-tight">{title}</h1>
        <span className="text-sm text-muted-foreground">{countLabel}</span>
      </div>
      <Button onClick={onCreate} disabled={createDisabled} className="h-11 px-6">
        {createLabel}
      </Button>
    </div>
  )
}

/** Filtro por nome + chave de ordenação A–Z / Z–A, no padrão do design. */
export function FilterSortRow({
  value,
  onChange,
  sortAsc,
  onToggleSort,
}: {
  value: string
  onChange: (value: string) => void
  sortAsc: boolean
  onToggleSort: () => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Filtrar por nome"
        className="h-10 max-w-[280px]"
      />
      <button
        type="button"
        onClick={onToggleSort}
        aria-label={sortAsc ? 'Ordenar de Z a A' : 'Ordenar de A a Z'}
        className="cursor-pointer rounded-full bg-[var(--color-neutral-100)] px-3.5 py-1.5 text-xs text-[var(--color-neutral-800)] transition-colors hover:bg-[var(--color-neutral-200)]"
      >
        {sortAsc ? 'A–Z' : 'Z–A'}
      </button>
    </div>
  )
}

/** Estado vazio de uma tela de cadastro, no padrão do design. */
export function EmptyPanel({
  kicker,
  title,
  description,
  actionLabel,
  onAction,
}: {
  kicker: string
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-3 rounded-[28px] bg-card px-8 py-10 shadow-sm">
      <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
        {kicker}
      </span>
      <div className="flex items-center gap-2">
        <span className="size-[18px] rounded-full bg-[var(--color-neutral-300)]" />
        <span className="size-8 rounded-full bg-accent-2/40" />
      </div>
      <h3 className="text-2xl">{title}</h3>
      <p className="max-w-[400px] text-sm text-muted-foreground">{description}</p>
      <Button onClick={onAction} className="mt-1">
        {actionLabel}
      </Button>
    </div>
  )
}

/** Ação de linha da tabela (Editar/Excluir), em ghost pill. */
export function GhostAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-full px-3 py-1.5 font-heading text-sm text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-45"
    >
      {children}
    </button>
  )
}
