import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-8">
      <div className="grid w-full overflow-hidden rounded-[32px] shadow-lg sm:grid-cols-2">
        <div className="hidden flex-col justify-between gap-10 bg-card p-11 sm:flex">
          <div className="flex items-center gap-2.5 font-heading text-lg">
            <span className="block size-[22px] rounded-full bg-accent-2" />
            Suplemento Consciente
          </div>

          <div className="flex items-end gap-3.5">
            <span className="size-[60px] rounded-full bg-[var(--color-accent-200)]" />
            <span className="size-[104px] rounded-full bg-accent-2/40" />
            <span className="size-9 rounded-full bg-[var(--color-neutral-300)]" />
          </div>

          <div>
            <h2 className="max-w-[320px] text-[34px] leading-[1.1] tracking-tight text-balance">
              Cadastre produtos, vídeos e perguntas do quiz
            </h2>
            <p className="mt-2.5 max-w-[320px] text-sm text-muted-foreground">
              Tudo que é publicado aqui aparece na consulta pública em minutos.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-background p-8 sm:p-14">
          <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
            Acesso restrito
          </span>
          <h1 className="mt-2 mb-2 text-4xl tracking-tight">
            Painel administrativo
          </h1>
          <p className="mb-7 max-w-[380px] text-sm text-muted-foreground">
            Acesso restrito ao administrador do Suplemento Consciente.
          </p>
          <LoginForm />
          <p className="mt-4 max-w-[380px] text-xs text-muted-foreground">
            Sessão encerrada automaticamente após período de inatividade.
          </p>
        </div>
      </div>
    </div>
  )
}
