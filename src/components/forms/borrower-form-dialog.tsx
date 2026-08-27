import { useEffect, useState, type FormEvent } from 'react'
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
import { createBorrower, updateBorrower } from '@/lib/api'
import { formatError } from '@/lib/utils'
import type { Borrower, BorrowerFormValues } from '@/types/database'

type BorrowerFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrower?: Borrower | null
  onSaved: (borrower?: Borrower) => Promise<void> | void
}

const EMPTY: BorrowerFormValues = { name: '', email: '', phone: '' }

export function BorrowerFormDialog({ open, onOpenChange, borrower, onSaved }: BorrowerFormDialogProps) {
  const [values, setValues] = useState<BorrowerFormValues>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setValues(
      borrower
        ? { name: borrower.name, email: borrower.email ?? '', phone: borrower.phone ?? '' }
        : EMPTY,
    )
  }, [borrower, open])

  function reset(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (nextOpen) {
      setError(null)
      setValues(
        borrower
          ? { name: borrower.name, email: borrower.email ?? '', phone: borrower.phone ?? '' }
          : EMPTY,
      )
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (borrower) {
        await updateBorrower(borrower.id, values)
        toast.success('Borrower updated')
        await onSaved()
      } else {
        const created = await createBorrower(values)
        toast.success('Borrower added')
        await onSaved(created)
      }
      reset(false)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{borrower ? 'Edit borrower' : 'Add borrower'}</DialogTitle>
          <DialogDescription>Name is enough. Email and phone are optional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="borrower-name">Name</Label>
            <Input
              id="borrower-name"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              placeholder="Rahul"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="borrower-email">Email</Label>
            <Input
              id="borrower-email"
              type="email"
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="borrower-phone">Phone</Label>
            <Input
              id="borrower-phone"
              value={values.phone}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : borrower ? 'Save changes' : 'Add borrower'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
