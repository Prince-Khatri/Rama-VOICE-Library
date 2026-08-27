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
import { Textarea } from '@/components/ui/textarea'
import { createBook, updateBook } from '@/lib/api'
import { formatError } from '@/lib/utils'
import type { BookFormValues, BookWithStats } from '@/types/database'

type BookFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  book?: BookWithStats | null
  onSaved: () => Promise<void> | void
}

const EMPTY: BookFormValues = {
  title: '',
  author: '',
  description: '',
  cover_url: '',
  copies: 1,
}

export function BookFormDialog({ open, onOpenChange, book, onSaved }: BookFormDialogProps) {
  const editing = Boolean(book)
  const [values, setValues] = useState<BookFormValues>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setValues(
      book
        ? {
            title: book.title,
            author: book.author,
            description: book.description ?? '',
            cover_url: book.cover_url ?? '',
            copies: Math.max(1, book.total_copies || 1),
          }
        : EMPTY,
    )
  }, [book, open])

  function reset(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (nextOpen) {
      setError(null)
      setValues(
        book
          ? {
              title: book.title,
              author: book.author,
              description: book.description ?? '',
              cover_url: book.cover_url ?? '',
              copies: Math.max(1, book.total_copies || 1),
            }
          : EMPTY,
      )
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.title.trim() || !values.author.trim()) {
      setError('Title and author are required.')
      return
    }
    if (!editing && (!Number.isInteger(values.copies) || values.copies < 1)) {
      setError('Add at least one copy.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (book) {
        await updateBook(book.id, values)
        toast.success('Book updated')
      } else {
        await createBook(values)
        toast.success('Book added to your library')
      }
      await onSaved()
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
          <DialogTitle>{editing ? 'Edit book' : 'Add book'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the catalog details. Copies are managed separately.'
              : 'Add a title and the number of physical copies you own.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              placeholder="Bhagavad Gita As It Is"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={values.author}
              onChange={(event) => setValues((current) => ({ ...current, author: event.target.value }))}
              placeholder="A.C. Bhaktivedanta Swami Prabhupada"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Optional notes about this edition"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cover">Cover image URL</Label>
            <Input
              id="cover"
              value={values.cover_url}
              onChange={(event) => setValues((current) => ({ ...current, cover_url: event.target.value }))}
              placeholder="https://"
            />
          </div>
          {!editing ? (
            <div className="grid gap-2">
              <Label htmlFor="copies">Copies</Label>
              <Input
                id="copies"
                type="number"
                min={1}
                value={values.copies}
                onChange={(event) =>
                  setValues((current) => ({ ...current, copies: Number(event.target.value) }))
                }
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add book'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
