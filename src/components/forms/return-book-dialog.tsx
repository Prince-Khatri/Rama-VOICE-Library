import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { returnBook } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatError } from '@/lib/utils'
import type { LoanWithDetails } from '@/types/database'

type ReturnBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: LoanWithDetails | null
  onReturned: () => Promise<void> | void
}

export function ReturnBookDialog({ open, onOpenChange, loan, onReturned }: ReturnBookDialogProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!loan) return
    setSaving(true)
    setError(null)
    try {
      await returnBook(loan.id)
      toast.success(`Returned “${loan.copy.book.title}”`)
      await onReturned()
      onOpenChange(false)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return book</DialogTitle>
          <DialogDescription>This keeps the loan in history and makes the copy available again.</DialogDescription>
        </DialogHeader>
        {loan ? (
          <div className="rounded-xl bg-secondary p-4 text-sm">
            <p className="font-medium">{loan.copy.book.title}</p>
            <p className="text-muted-foreground">{loan.copy.copy_code} · borrowed by {loan.borrower.name}</p>
            <p className="mt-2 text-muted-foreground">Issued {formatDate(loan.borrowed_at)}</p>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={saving || !loan}>
            {saving ? 'Returning…' : 'Confirm return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
