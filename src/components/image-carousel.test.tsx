import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageCarousel } from './image-carousel'

const foto = { src: 'https://exemplo.com/foto.png', alt: 'Foto do produto' }
const tabela = {
  src: 'https://exemplo.com/tabela.png',
  alt: 'Tabela nutricional',
  fit: 'contain' as const,
}

describe('ImageCarousel', () => {
  it('com uma imagem só, renderiza sem controles', () => {
    render(<ImageCarousel images={[foto]} />)

    expect(screen.getByAltText('Foto do produto')).toBeInTheDocument()
    expect(screen.queryByLabelText('Próxima imagem')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Imagem anterior')).not.toBeInTheDocument()
  })

  it('com duas imagens, mostra setas e dots', () => {
    render(<ImageCarousel images={[foto, tabela]} />)

    expect(screen.getByAltText('Foto do produto')).toBeInTheDocument()
    expect(screen.getByLabelText('Próxima imagem')).toBeInTheDocument()
    expect(screen.getByLabelText('Imagem anterior')).toBeInTheDocument()
    expect(screen.getByLabelText('Ver imagem 2 de 2')).toBeInTheDocument()
  })

  it('navega entre as imagens pelas setas e pelos dots', () => {
    render(<ImageCarousel images={[foto, tabela]} />)

    fireEvent.click(screen.getByLabelText('Próxima imagem'))
    expect(screen.getByAltText('Tabela nutricional')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Ver imagem 1 de 2'))
    expect(screen.getByAltText('Foto do produto')).toBeInTheDocument()

    // Volta do primeiro para o último (wrap-around).
    fireEvent.click(screen.getByLabelText('Imagem anterior'))
    expect(screen.getByAltText('Tabela nutricional')).toBeInTheDocument()
  })

  it('sem imagens, não renderiza nada', () => {
    const { container } = render(<ImageCarousel images={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
