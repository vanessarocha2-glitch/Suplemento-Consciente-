import { describe, it, expect } from 'vitest'
import { youtubeThumbnail } from './youtube'

describe('youtubeThumbnail', () => {
  it('extrai o id de youtube.com/watch', () => {
    expect(youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
    expect(
      youtubeThumbnail('https://youtube.com/watch?v=abc123DEF45&t=30s')
    ).toBe('https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg')
  })

  it('extrai o id de youtu.be', () => {
    expect(youtubeThumbnail('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
  })

  it('extrai o id de embed e shorts', () => {
    expect(youtubeThumbnail('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
    expect(youtubeThumbnail('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
  })

  it('devolve null para URLs que não são do YouTube', () => {
    expect(youtubeThumbnail('https://vimeo.com/123456')).toBeNull()
    expect(youtubeThumbnail('https://example.com/watch?v=abc')).toBeNull()
    expect(youtubeThumbnail('https://youtube.com/watch?v=curto')).toBeNull()
  })
})
