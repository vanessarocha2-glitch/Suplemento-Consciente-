import { listVideos } from '@/features/videos/queries'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function VideosPage() {
  const videos = await listVideos()

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Vídeos educativos</h1>
        <p className="text-muted-foreground">
          Conteúdos curtos sobre suplementos, usos e cuidados.
        </p>
      </div>

      {videos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum vídeo publicado ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <a
              key={video.id}
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle>{video.title}</CardTitle>
                  <CardDescription>{video.description}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
