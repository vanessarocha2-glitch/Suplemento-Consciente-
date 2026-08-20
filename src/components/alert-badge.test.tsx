import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertBadge, severityLabel } from './alert-badge'

describe('severityLabel', () => {
  it('traduz cada nivel de gravidade', () => {
    expect(severityLabel('info')).toBe('Informativo')
    expect(severityLabel('warning')).toBe('Atenção')
    expect(severityLabel('danger')).toBe('Grave')
  })
})

describe('AlertBadge', () => {
  const alerta = {
    id: '1',
    title: 'Não recomendado para adolescentes',
    description: 'Procure orientação profissional.',
    severity: 'danger' as const,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('mostra titulo, descricao e gravidade', () => {
    render(<AlertBadge alert={alerta} />)
    expect(screen.getByText('Não recomendado para adolescentes')).toBeDefined()
    expect(screen.getByText('Procure orientação profissional.')).toBeDefined()
    expect(screen.getByText('Grave')).toBeDefined()
  })
})
