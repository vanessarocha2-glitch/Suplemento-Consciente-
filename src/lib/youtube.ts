/**
 * Devolve a URL da miniatura do YouTube para uma URL de vídeo reconhecida,
 * ou null quando a URL não é um link do YouTube que dê para decodificar.
 * hqdefault sempre existe para vídeos públicos (diferente de maxresdefault).
 */
export function youtubeThumbnail(videoUrl: string): string | null {
  const patterns = [
    // youtube.com/watch?v=, youtube.com/embed/, youtube.com/shorts/ e live
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{11})/,
    // youtu.be/…
    /youtu\.be\/([\w-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = videoUrl.match(pattern)
    if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  }

  return null
}
