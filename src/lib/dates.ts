import { format, formatDistanceToNow, isBefore, parseISO, startOfDay } from 'date-fns'

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'MMM d, yyyy')
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'MMM d')
}

export function formatRelative(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value
  return formatDistanceToNow(date, { addSuffix: true })
}

export function toDateInput(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

export function isOverdue(dueDate: string | null | undefined, returnedAt: string | null | undefined): boolean {
  if (!dueDate || returnedAt) return false
  return isBefore(startOfDay(parseISO(dueDate)), startOfDay(new Date()))
}

export function addDays(from: Date, days: number): Date {
  const next = new Date(from)
  next.setDate(next.getDate() + days)
  return next
}
