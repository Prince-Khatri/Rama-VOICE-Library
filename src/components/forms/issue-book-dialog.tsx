import { useMemo, useState, type FormEvent } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { issueBook } from '@/lib/api'
import { addDays, toDateInput } from '@/lib/dates'
import { formatError } from '@/lib/utils'
import type { BookWithStats, Borrower, LibrarySettings } from '@/types/database'
import { BorrowerFormDialog } from '@/components/forms/borrower-form-dialog'

type IssueBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: BookWithStats | null
  borrowers: Borrower[]
  settings: LibrarySettings | null
  copyId?: string
  onIssued: () => Promise<void> | void
  onBorrowersChanged?: () => Promise<void> | void
}

export function IssueBookDialog({
  open,
  onOpenChange,
  book,
  borrowers,
  settings,
  copyId,
  onIssued,
  onBorrowersChanged,
}: IssueBookDialogProps) {
  const dueDatesEnabled = settings?.due_dates_enabled ?? true
  const defaultDays = settings?.default_loan_days ?? 14
  const [borrowerId, setBorrowerId] = useState('')
  const [dueDate, setDueDate] = useState(toDateInput(addDays(new Date(), defaultDays)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingBorrower, setAddingBorrower] = useState(false)

  const selectedCopy = useMemo(
    () => book?.copies.find((copy) => copy.id === copyId),
    [book, copyId],
  )

  function reset(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (nextOpen) {
      setBorrowerId('')
      setDueDate(toDateInput(addDays(new Date(), defaultDays)))
      setError(null)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!book) return
    if (book.available_copies < 1) {
      setError('Cannot issue this book. No copies are currently available.')
      return
    }
    if (!borrowerId) {
      setError('Select a borrower.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await issueBook({
        bookId: book.id,
        borrowerId,
        dueDate: dueDatesEnabled ? dueDate : null,
        copyId,
      })
      toast.success(`Issued “${book.title}”`)
      await onIssued()
      reset(false)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue book</DialogTitle>
            <DialogDescription>Checkout a physical copy to someone in your circle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Book</p>
              <p className="mt-1 font-medium">{book?.title ?? '—'}</p>
              <p className="text-sm text-muted-foreground">{book?.author}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Available copies</p>
                <p className="text-xl font-semibold">{book?.available_copies ?? 0}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Copy</p>
                <p className="text-xl font-semibold">{selectedCopy?.copy_code ?? 'Next available'}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Borrower</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setAddingBorrower(true)}
                >
                  Add borrower
                </button>
              </div>
              <Select value={borrowerId} onValueChange={setBorrowerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select borrower" />
                </SelectTrigger>
                <SelectContent>
                  {borrowers.map((borrower) => (
                    <SelectItem key={borrower.id} value={borrower.id}>
                      {borrower.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dueDatesEnabled ? (
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due date</Label>
                <Input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || (book?.available_copies ?? 0) < 1}>
                {saving ? 'Issuing…' : 'Confirm issue'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <BorrowerFormDialog
        open={addingBorrower}
        onOpenChange={setAddingBorrower}
        onSaved={async (created) => {
          await onBorrowersChanged?.()
          if (created) setBorrowerId(created.id)
        }}
      />
    </>
  )
}
