import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusTag } from './status-tag'

describe('StatusTag', () => {
  it('renderiza o label correto para status approved', () => {
    render(<StatusTag status="approved" />)
    expect(screen.getByText('Regularizado na Anvisa')).toBeDefined()
  })

  it('renderiza o label correto para status pending', () => {
    render(<StatusTag status="pending" />)
    expect(screen.getByText('Em análise na Anvisa')).toBeDefined()
  })

  it('renderiza o label correto para status not_found', () => {
    render(<StatusTag status="not_found" />)
    expect(screen.getByText('Registro não localizado')).toBeDefined()
  })

  it('inclui sufixo quando informado', () => {
    render(<StatusTag status="approved" suffix="(protocolo 123)" />)
    expect(screen.getByText(/protocolo 123/)).toBeDefined()
  })
})
