import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('combina classes simples', () => {
    expect(cn('flex', 'items-center', 'justify-between')).toBe(
      'flex items-center justify-between'
    )
  })

  it('ignora valores falsy e condicionais', () => {
    expect(cn('text-sm', false && 'hidden', null, undefined, 'font-medium')).toBe(
      'text-sm font-medium'
    )
  })

  it('mescla classes conflitantes do Tailwind corretamente', () => {
    expect(cn('px-2 py-1 text-red-500', 'px-4 text-blue-500')).toBe(
      'py-1 px-4 text-blue-500'
    )
  })

  it('suporta arrays e objetos de classe', () => {
    expect(
      cn(['rounded-md', 'border'], {
        'bg-primary': true,
        'text-white': true,
        'opacity-50': false,
      })
    ).toBe('rounded-md border bg-primary text-white')
  })
})
