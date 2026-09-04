// src/features/photo-search/photo-search-button.test.tsx
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { PhotoSearchButton } from './photo-search-button'
import { readLabelText } from './ocr'
import type { CatalogEntry } from './match'

const { push, toastError } = vi.hoisted(() => ({
  push: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('sonner', () => ({
  toast: { error: toastError },
}))

vi.mock('./ocr', () => ({
  readLabelText: vi.fn(),
}))

const catalog: CatalogEntry[] = [
  { id: 'c1', name: 'Creatina Monohidratada', category: { id: 'b1', name: 'Growth' } },
]

function selectPhoto(file: File) {
  const input = screen.getByTestId('photo-search-input')
  fireEvent.change(input, { target: { files: [file] } })
}

describe('PhotoSearchButton', () => {
  beforeEach(() => {
    push.mockReset()
    toastError.mockReset()
    vi.mocked(readLabelText).mockReset()
  })

  it('mostra estado de leitura e navega com o resultado do match', async () => {
    let resolveOcr: (text: string) => void = () => {}
    vi.mocked(readLabelText).mockReturnValue(
      new Promise((resolve) => {
        resolveOcr = resolve
      })
    )

    render(<PhotoSearchButton catalog={catalog} />)

    selectPhoto(new File(['foto'], 'rotulo.jpg', { type: 'image/jpeg' }))

    expect(screen.getByRole('button', { name: 'Buscar por foto do rótulo' })).toBeDisabled()

    await act(async () => {
      resolveOcr('GROWTH CREATINA MONOHIDRATADA')
    })

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/?q=Creatina+Monohidratada&brand=b1')
    )
    expect(screen.getByRole('button', { name: 'Buscar por foto do rótulo' })).not.toBeDisabled()
  })

  it('mostra toast de erro e nao navega quando a leitura falha', async () => {
    vi.mocked(readLabelText).mockRejectedValue(new Error('sem internet'))

    render(<PhotoSearchButton catalog={catalog} />)

    selectPhoto(new File(['foto'], 'rotulo.jpg', { type: 'image/jpeg' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Buscar por foto do rótulo' })).not.toBeDisabled()
  })

  it('nao faz nada quando nenhum arquivo e selecionado', () => {
    render(<PhotoSearchButton catalog={catalog} />)

    const input = screen.getByTestId('photo-search-input')
    fireEvent.change(input, { target: { files: [] } })

    expect(readLabelText).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('avisa o pai quando o estado de leitura muda', async () => {
    let resolveOcr: (text: string) => void = () => {}
    vi.mocked(readLabelText).mockReturnValue(
      new Promise((resolve) => {
        resolveOcr = resolve
      })
    )
    const onReadingChange = vi.fn()

    render(<PhotoSearchButton catalog={catalog} onReadingChange={onReadingChange} />)

    selectPhoto(new File(['foto'], 'rotulo.jpg', { type: 'image/jpeg' }))

    expect(onReadingChange).toHaveBeenNthCalledWith(1, true)

    await act(async () => {
      resolveOcr('GROWTH CREATINA MONOHIDRATADA')
    })

    await waitFor(() => expect(onReadingChange).toHaveBeenNthCalledWith(2, false))
  })
})
