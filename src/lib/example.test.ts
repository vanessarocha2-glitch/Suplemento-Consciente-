import { describe, it, expect } from 'vitest'
import { greet } from './example'

describe('greet', () => {
  it('retorna uma saudação com o nome', () => {
    expect(greet('Vitor')).toBe('Olá, Vitor!')
  })
})
