'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CarouselImage = {
  src: string
  alt: string
  /** cover preenche o quadro (foto do produto); contain mostra a imagem
      inteira (tabela nutricional, que é mais alta que larga). */
  fit?: 'cover' | 'contain'
}

/** Carrossel simples de imagens: setas nas laterais e dots embaixo.
    Com uma única imagem, renderiza só a imagem, sem controles. */
export function ImageCarousel({ images }: { images: CarouselImage[] }) {
  const [index, setIndex] = useState(0)

  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={images[0].src}
        alt={images[0].alt}
        loading="lazy"
        className={`size-full ${images[0].fit === 'contain' ? 'object-contain' : 'object-cover'} [filter:saturate(0.6)_contrast(0.85)_brightness(1.1)]`}
      />
    )
  }

  const current = images[index]

  function goTo(next: number) {
    setIndex((next + images.length) % images.length)
  }

  return (
    <div className="group/carousel relative size-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current.src}
        src={current.src}
        alt={current.alt}
        loading="lazy"
        className={`size-full ${current.fit === 'contain' ? 'object-contain' : 'object-cover'} [filter:saturate(0.6)_contrast(0.85)_brightness(1.1)]`}
      />

      <button
        type="button"
        aria-label="Imagem anterior"
        onClick={() => goTo(index - 1)}
        className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Próxima imagem"
        onClick={() => goTo(index + 1)}
        className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100"
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Ver imagem ${i + 1} de ${images.length}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`size-2 cursor-pointer rounded-full transition-colors ${
              i === index ? 'bg-primary' : 'bg-card/90 hover:bg-card'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
