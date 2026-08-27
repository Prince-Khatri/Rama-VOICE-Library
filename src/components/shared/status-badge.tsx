import { Badge } from '@/components/ui/badge'
import { isOverdue } from '@/lib/dates'
import type { CopyStatus } from '@/types/database'

export function CopyStatusBadge({ status }: { status: CopyStatus }) {
  if (status === 'AVAILABLE') return <Badge variant="success">Available</Badge>
  if (status === 'BORROWED') return <Badge variant="warning">Borrowed</Badge>
  if (status === 'LOST') return <Badge variant="danger">Lost</Badge>
  return <Badge variant="muted">Damaged</Badge>
}

export function LoanStatusBadge({
  dueDate,
  returnedAt,
}: {
  dueDate: string | null
  returnedAt: string | null
}) {
  if (returnedAt) return <Badge variant="secondary">Returned</Badge>
  if (isOverdue(dueDate, returnedAt)) return <Badge variant="danger">Overdue</Badge>
  return <Badge variant="warning">Borrowed</Badge>
}

export function BookAvailabilityBadge({ available, total }: { available: number; total: number }) {
  if (total === 0) return <Badge variant="muted">No copies</Badge>
  if (available === 0) return <Badge variant="warning">Unavailable</Badge>
  return <Badge variant="success">{available} available</Badge>
}
