import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommentForm } from './comment-form'
import { submitComment } from './actions'

vi.mock('./actions', () => ({
  submitComment: vi.fn(),
}))

describe('CommentForm', () => {
  beforeEach(() => {
    vi.mocked(submitComment).mockReset()
  })

  it('envia apelido, nota e texto ao suplemento certo', async () => {
    vi.mocked(submitComment).mockResolvedValue({ error: null })

    render(<CommentForm supplementId="supp-1" />)

    fireEvent.change(screen.getByLabelText('Seu apelido'), {
      target: { value: 'Ana' },
    })
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.change(screen.getByLabelText('Seu comentário'), {
      target: { value: 'Gostei bastante do sabor.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }))

    await waitFor(() => expect(submitComment).toHaveBeenCalledTimes(1))

    const [supplementId, formData] = vi.mocked(submitComment).mock.calls[0]
    expect(supplementId).toBe('supp-1')
    expect(formData.get('author_name')).toBe('Ana')
    expect(formData.get('rating')).toBe('4')
    expect(formData.get('comment_text')).toBe('Gostei bastante do sabor.')
  })

  it('limpa o formulario apos envio bem-sucedido', async () => {
    vi.mocked(submitComment).mockResolvedValue({ error: null })

    render(<CommentForm supplementId="supp-1" />)

    const nameInput = screen.getByLabelText('Seu apelido') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.change(screen.getByLabelText('Seu comentário'), {
      target: { value: 'Gostei bastante do sabor.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }))

    await waitFor(() => expect(nameInput.value).toBe(''))
  })

  it('mostra o erro do servidor e mantem o texto digitado', async () => {
    vi.mocked(submitComment).mockResolvedValue({ error: 'Escreva um comentário' })

    render(<CommentForm supplementId="supp-1" />)

    const nameInput = screen.getByLabelText('Seu apelido') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Escreva um comentário')
    expect(nameInput.value).toBe('Ana')
  })
})
