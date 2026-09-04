import { describe, it, expect } from 'vitest'
import { buildQueryFromLabel, type CatalogEntry } from './match'

const catalog: CatalogEntry[] = [
  { id: 'c1', name: 'Creatina Monohidratada', category: { id: 'b1', name: 'Growth' } },
  { id: 'c2', name: 'Whey Protein Concentrado', category: { id: 'b2', name: 'Max Titanium' } },
  { id: 'c3', name: 'Colágeno Hidrolisado', category: { id: 'b3', name: 'Dux' } },
]

describe('buildQueryFromLabel', () => {
  it('acha match exato de marca e produto', () => {
    const text = 'GROWTH CREATINA MONOHIDRATADA 250G SUPLEMENTO ALIMENTAR'

    expect(buildQueryFromLabel(text, catalog)).toEqual({
      q: 'Creatina Monohidratada',
      brandId: 'b1',
    })
  })

  it('tolera erro de OCR via similaridade de trigramas', () => {
    const singleItemCatalog: CatalogEntry[] = [
      { id: 'x1', name: 'Creatina', category: { id: 'b1', name: 'Growth' } },
    ]

    expect(buildQueryFromLabel('GROWTH CREATIN', singleItemCatalog)).toEqual({
      q: 'Creatina',
      brandId: 'b1',
    })
  })

  it('cai no fallback de tokens crus quando nada do catálogo bate', () => {
    expect(buildQueryFromLabel('Zqxvkbw Glorfindel Plumbaceous', catalog)).toEqual({
      q: 'Zqxvkbw Glorfindel Plumbaceous',
      brandId: null,
    })
  })

  it('devolve vazio quando o OCR não lê nada', () => {
    expect(buildQueryFromLabel('', catalog)).toEqual({ q: '', brandId: null })
    expect(buildQueryFromLabel('   ', catalog)).toEqual({ q: '', brandId: null })
  })

  it('filtra ruído de rótulo (peso, sabor, "suplemento alimentar" etc.)', () => {
    const text =
      'SUPLEMENTO ALIMENTAR SABOR CHOCOLATE WHEY PROTEIN CONCENTRADO MAX TITANIUM'

    expect(buildQueryFromLabel(text, catalog)).toEqual({
      q: 'Whey Protein Concentrado',
      brandId: 'b2',
    })
  })

  it('ignora acentuação ao comparar com o catálogo', () => {
    const text = 'DUX COLÁGENO HIDROLISADO'

    expect(buildQueryFromLabel(text, catalog)).toEqual({
      q: 'Colágeno Hidrolisado',
      brandId: 'b3',
    })
  })
})
