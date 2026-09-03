import { listAllComments } from '@/features/comments/queries'
import { CommentsTable } from './comments-table'

export default async function AdminCommentsPage() {
  const comments = await listAllComments()
  return <CommentsTable comments={comments} />
}
