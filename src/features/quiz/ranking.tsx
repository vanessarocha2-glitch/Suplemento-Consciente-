import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { QuizScore } from '@/lib/types'

const medals = ['🥇', '🥈', '🥉']

export function Ranking({
  scores,
  highlightId,
}: {
  scores: QuizScore[]
  highlightId?: string
}) {
  if (scores.length === 0) {
    return (
      <p className="text-muted-foreground">
        Ninguém pontuou ainda. Seja o primeiro do ranking.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead className="w-24 text-right">Acertos</TableHead>
          <TableHead className="w-24 text-right">Nota</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scores.map((score, index) => (
          <TableRow
            key={score.id}
            className={score.id === highlightId ? 'bg-muted font-medium' : undefined}
          >
            <TableCell>{medals[index] ?? index + 1}</TableCell>
            <TableCell>{score.player_name}</TableCell>
            <TableCell className="text-right">
              {score.correct_count}/{score.total_questions}
            </TableCell>
            <TableCell className="text-right">{score.percentage}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
