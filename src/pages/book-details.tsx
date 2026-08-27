import { ArrowLeft, BookOpen, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookFormDialog } from '@/components/forms/book-form-dialog'
import { IssueBookDialog } from '@/components/forms/issue-book-dialog'
import { ReturnBookDialog } from '@/components/forms/return-book-dialog'
import { BookCover } from '@/components/shared/book-cover'
import { EmptyState } from '@/components/shared/empty-state'
import { CopyStatusBadge, LoanStatusBadge } from '@/components/shared/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/hooks/use-library'
import { addCopy, deleteBook, fetchBook, fetchLoansForBook, removeCopy, updateCopyStatus } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatError } from '@/lib/utils'
import type { BookCopy, BookWithStats, LoanWithDetails } from '@/types/database'

export function BookDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { borrowers, settings, reload: reloadLibrary } = useLibrary()
  const [book, setBook] = useState<BookWithStats | null>(null)
  const [history, setHistory] = useState<LoanWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueCopyId, setIssueCopyId] = useState<string | undefined>()
  const [returnLoan, setReturnLoan] = useState<LoanWithDetails | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busyCopy, setBusyCopy] = useState<string | null>(null)

  async function reload() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [nextBook, nextHistory] = await Promise.all([fetchBook(id), fetchLoansForBook(id)])
      setBook(nextBook)
      setHistory(nextHistory)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [id])

  async function onCopyAction(copy: BookCopy, action: 'remove' | 'lost' | 'damaged' | 'available') {
    if (!book) return
    setBusyCopy(copy.id)
    try {
      if (action === 'remove') await removeCopy(copy)
      if (action === 'lost') await updateCopyStatus(copy, 'LOST')
      if (action === 'damaged') await updateCopyStatus(copy, 'DAMAGED')
      if (action === 'available') await updateCopyStatus(copy, 'AVAILABLE')
      toast.success('Copy updated')
      await reload()
      await reloadLibrary()
    } catch (err) {
      toast.error(formatError(err))
    } finally {
      setBusyCopy(null)
    }
  }

  async function handleAddCopy() {
    if (!book) return
    try {
      const copy = await addCopy(book)
      toast.success(`Added ${copy.copy_code}`)
      await reload()
      await reloadLibrary()
    } catch (err) {
      toast.error(formatError(err))
    }
  }

  if (loading) {
    return <Skeleton className="h-80" />
  }

  if (error || !book) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Book not found"
        description={error ?? 'This title is no longer in your library.'}
        action={
          <Button asChild>
            <Link to="/books">Back to books</Link>
          </Button>
        }
      />
    )
  }

  const activeByCopy = new Map(
    history.filter((loan) => !loan.returned_at).map((loan) => [loan.copy_id, loan]),
  )

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/books">
          <ArrowLeft className="size-4" />
          Books
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <BookCover title={book.title} coverUrl={book.cover_url} className="h-72 w-full max-w-[220px]" />
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">{book.title}</h1>
              <p className="mt-1 text-muted-foreground">{book.author}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setIssueCopyId(undefined)
                  setIssueOpen(true)
                }}
                disabled={book.available_copies < 1}
              >
                Issue book
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          {book.description ? <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">{book.description}</p> : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Meta label="Total copies" value={String(book.total_copies)} />
            <Meta label="Available" value={String(book.available_copies)} />
            <Meta label="Borrowed" value={String(book.borrowed_copies)} />
            <Meta label="Date added" value={formatDate(book.created_at)} />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">Copies</h2>
            <Button size="sm" variant="outline" onClick={() => void handleAddCopy()}>
              <Plus className="size-4" />
              Add copy
            </Button>
          </div>
          {book.copies.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No copies yet"
              description="Add a physical copy so this title can be issued."
              action={<Button onClick={() => void handleAddCopy()}>Add copy</Button>}
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="divide-y divide-border">
              {book.copies.map((copy) => {
                const loan = activeByCopy.get(copy.id)
                return (
                  <div key={copy.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{copy.copy_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {loan ? `Borrowed by ${loan.borrower.name}` : copy.status === 'AVAILABLE' ? 'On the shelf' : 'Not available to issue'}
                      </p>
                    </div>
                    <CopyStatusBadge status={copy.status} />
                    {loan ? (
                      <Button size="sm" variant="outline" onClick={() => setReturnLoan(loan)}>
                        Return
                      </Button>
                    ) : copy.status === 'AVAILABLE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIssueCopyId(copy.id)
                          setIssueOpen(true)
                        }}
                      >
                        Issue
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" disabled={busyCopy === copy.id}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {copy.status !== 'AVAILABLE' && copy.status !== 'BORROWED' ? (
                          <DropdownMenuItem onClick={() => void onCopyAction(copy, 'available')}>
                            Mark available
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => void onCopyAction(copy, 'lost')}>Mark as lost</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void onCopyAction(copy, 'damaged')}>Mark as damaged</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => void onCopyAction(copy, 'remove')}>Remove copy</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl">Borrowing history</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">This book has not been issued yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Copy</th>
                    <th className="pb-3 font-medium">Borrower</th>
                    <th className="pb-3 font-medium">Issued</th>
                    <th className="pb-3 font-medium">Due</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((loan) => (
                    <tr key={loan.id} className="border-t border-border">
                      <td className="py-3">{loan.copy.copy_code}</td>
                      <td>
                        <Link to={`/borrowers/${loan.borrower.id}`} className="hover:underline">
                          {loan.borrower.name}
                        </Link>
                      </td>
                      <td>{formatDate(loan.borrowed_at)}</td>
                      <td>{formatDate(loan.due_date)}</td>
                      <td>
                        <LoanStatusBadge dueDate={loan.due_date} returnedAt={loan.returned_at} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BookFormDialog open={editOpen} onOpenChange={setEditOpen} book={book} onSaved={reload} />
      <IssueBookDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        book={book}
        copyId={issueCopyId}
        borrowers={borrowers}
        settings={settings}
        onIssued={async () => {
          await reload()
          await reloadLibrary()
        }}
        onBorrowersChanged={reloadLibrary}
      />
      <ReturnBookDialog
        open={Boolean(returnLoan)}
        onOpenChange={(open) => !open && setReturnLoan(null)}
        loan={returnLoan}
        onReturned={async () => {
          await reload()
          await reloadLibrary()
        }}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              Books with borrowing history are kept so the record stays intact. Copies without history will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteBook(book.id)
                  toast.success('Book deleted')
                  navigate('/books')
                } catch (err) {
                  toast.error(formatError(err))
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

