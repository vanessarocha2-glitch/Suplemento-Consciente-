import Link from 'next/link'
import { listVideos } from '@/features/videos/queries'

function PlayGlyph({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-block"
      style={{
        width: 0,
        height: 0,
        borderTop: `${size * 0.65}px solid transparent`,
        borderBottom: `${size * 0.65}px solid transparent`,
        borderLeft: `${size}px solid var(--color-accent-700)`,
        marginLeft: 3,
      }}
    />
  )
}

export default async function VideosPage() {
  const videos = await listVideos()
  const [featured, ...rest] = videos

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8 sm:py-12">
      <div className="grid items-end gap-10 sm:grid-cols-[1fr_auto]">
        <div>
          <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
            Biblioteca
          </span>
          <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl">
            Vídeos educativos
          </h1>
          <p className="mt-3 max-w-lg text-lg text-muted-foreground">
            Conteúdos curtos sobre suplementos, usos e cuidados.
          </p>
        </div>
        {videos.length > 0 && (
          <div className="hidden flex-col items-end gap-2 sm:flex">
            <div className="flex size-24 items-center justify-center rounded-full bg-[var(--color-accent-200)]">
              <PlayGlyph size={22} />
            </div>
            <span className="text-xs text-muted-foreground">
              {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
            </span>
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[28px] bg-card px-8 py-10 shadow-sm sm:max-w-md">
          <div className="size-16 rounded-full bg-accent-2/25" />
          <h3 className="text-2xl">Nenhum vídeo publicado ainda</h3>
          <p className="text-sm text-muted-foreground">
            Volte em breve para conferir os próximos conteúdos.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {featured && (
            <a
              href={featured.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-6 rounded-[24px] bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-stretch"
            >
              <div className="relative aspect-video shrink-0 overflow-hidden rounded-[16px] bg-[repeating-linear-gradient(135deg,var(--color-neutral-200)_0_10px,var(--color-neutral-300)_10px_20px)] sm:w-[46%]">
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-card shadow-md">
                    <PlayGlyph size={18} />
                  </span>
                </span>
              </div>
              <div className="flex flex-col justify-center gap-2.5 py-1">
                <span className="text-[10px] tracking-[0.1em] text-primary uppercase">
                  Em destaque
                </span>
                <span className="font-heading text-2xl leading-tight text-balance">
                  {featured.title}
                </span>
                <p className="text-sm text-muted-foreground">
                  {featured.description}
                </p>
                <span className="mt-1 inline-flex h-9 w-fit items-center rounded-full bg-primary px-6 font-heading text-sm text-primary-foreground group-hover:bg-[var(--color-accent-600)]">
                  Assistir
                </span>
              </div>
            </a>
          )}

          {rest.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((video) => (
                <a
                  key={video.id}
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col gap-3 rounded-[22px] bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-video overflow-hidden rounded-[16px] bg-[repeating-linear-gradient(135deg,var(--color-neutral-200)_0_9px,var(--color-neutral-300)_9px_18px)]">
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex size-11 items-center justify-center rounded-full bg-card shadow-sm">
                        <PlayGlyph size={12} />
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 px-0.5">
                    <span className="font-heading text-lg leading-tight">
                      {video.title}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {video.description}
                    </p>
                  </div>
                  <div className="flex justify-end px-0.5 pb-0.5 text-sm font-semibold text-[var(--color-accent-700)]">
                    Assistir
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="flex flex-col items-start gap-4 rounded-[28px] bg-accent-2/15 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-heading text-lg">
                Já sabe qual suplemento quer usar?
              </span>
              <p className="mt-1 text-sm text-[var(--color-accent-2-900)]">
                Consulte ingredientes, finalidade e situação na Anvisa antes de
                comprar.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-6 font-heading text-sm text-primary-foreground hover:bg-[var(--color-accent-600)]"
            >
              Consultar suplemento
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
