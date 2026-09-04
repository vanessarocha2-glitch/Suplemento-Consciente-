// src/features/photo-search/ocr.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import packageJson from '../../../package.json'

describe('TESSERACT_VERSION', () => {
  it('fica em sincronia com a versão de tesseract.js em package.json', () => {
    const ocrPath = fileURLToPath(new URL('./ocr.ts', import.meta.url))
    const ocrSource = readFileSync(ocrPath, 'utf-8')
    const match = ocrSource.match(/TESSERACT_VERSION = '([^']+)'/)

    expect(match?.[1]).toBe(packageJson.dependencies['tesseract.js'])
  })
})
