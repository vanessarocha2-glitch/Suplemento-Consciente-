import { describe, it, expect } from 'vitest'
import { parseSearchParams } from './search'

describe('parseSearchParams', () => {
  it('devolve filtros vazios quando nao ha parametros', () => {
    expect(parseSearchParams({})).toEqual({ term: '', brandId: null })
  })

  it('extrai o termo de busca', () => {
    expect(parseSearchParams({ q: 'whey' })).toEqual({ term: 'whey', brandId: null })
  })

  it('remove espacos em volta do termo', () => {
    expect(parseSearchParams({ q: '  whey  ' }).term).toBe('whey')
  })

  it('extrai a marca selecionada', () => {
    const id = '3f1a7c8e-1b2d-4c3e-9f8a-0b1c2d3e4f50'
    expect(parseSearchParams({ brand: id }).brandId).toBe(id)
  })

  it('ignora marca que nao e UUID', () => {
    expect(parseSearchParams({ brand: 'dux' }).brandId).toBeNull()
  })

  it('trata o valor "all" como sem filtro de marca', () => {
    expect(parseSearchParams({ brand: 'all' }).brandId).toBeNull()
  })

  it('usa o primeiro valor quando o parametro vem repetido', () => {
    expect(parseSearchParams({ q: ['whey', 'creatina'] }).term).toBe('whey')
  })

  it('escapa curingas do LIKE no termo', () => {
    expect(parseSearchParams({ q: '100%' }).term).toBe('100\\%')
  })

  it('escapa o curinga _ do LIKE no termo', () => {
    expect(parseSearchParams({ q: 'my_supp' }).term).toBe('my\\_supp')
  })

  it('escapa barra invertida literal no termo', () => {
    expect(parseSearchParams({ q: 'a\\b' }).term).toBe('a\\\\b')
  })
})
