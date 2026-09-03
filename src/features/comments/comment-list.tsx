import { Star } from 'lucide-react'
import type { SupplementComment } from '@/lib/types'

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={
            value <= rating
              ? 'size-4 fill-[var(--color-accent-500)] text-[var(--color-accent-500)]'
              : 'size-4 fill-transparent text-[var(--color-neutral-300)]'
          }
        />
      ))}
    </div>
  )
}

export function CommentList({
  comments,
  average,
  count,
}: {
  comments: SupplementComment[]
  average: number | null
  count: number
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-[22px] bg-card p-5">
        {average === null ? (
          <p className="text-muted-foreground">
            Ninguém avaliou ainda. Seja o primeiro a comentar.
          </p>
        ) : (
          <>
            <span className="font-heading text-3xl">{average.toFixed(1)}</span>
            <div className="space-y-1">
              <StarRow rating={Math.round(average)} />
              <span className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>
          </>
        )}
      </div>

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-[16px] bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{comment.author_name}</span>
                <StarRow rating={comment.rating} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {comment.comment_text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
