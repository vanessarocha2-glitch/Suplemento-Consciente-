'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitComment } from './actions'

export function CommentForm({ supplementId }: { supplementId: string }) {
  const [authorName, setAuthorName] = useState('')
  const [rating, setRating] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitComment(supplementId, formData)

      if (result.error) {
        setError(result.error)
        return
      }

      setAuthorName('')
      setRating(0)
      setCommentText('')
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-[22px] bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="author_name">Seu apelido</Label>
        <Input
          id="author_name"
          name="author_name"
          value={authorName}
          maxLength={40}
          placeholder="Como você quer aparecer"
          onChange={(event) => setAuthorName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label id="rating-label">Sua nota</Label>
        <input type="hidden" name="rating" value={rating} />
        <div role="group" aria-labelledby="rating-label" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
              aria-pressed={rating >= value}
              onClick={() => setRating(value)}
              className="cursor-pointer p-0.5"
            >
              <Star
                className={
                  rating >= value
                    ? 'size-6 fill-[var(--color-accent-500)] text-[var(--color-accent-500)]'
                    : 'size-6 fill-transparent text-[var(--color-neutral-300)]'
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment_text">Seu comentário</Label>
        <Textarea
          id="comment_text"
          name="comment_text"
          value={commentText}
          maxLength={1000}
          placeholder="O que você achou deste suplemento?"
          onChange={(event) => setCommentText(event.target.value)}
          className="min-h-[100px] rounded-[16px]"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar avaliação'}
      </Button>
    </form>
  )
}
