import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BorrowerFormDialog } from '@/components/forms/borrower-form-dialog'
import { ReturnBookDialog } from '@/components/forms/return-book-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { LoanStatusBadge } from '@/components/shared/status-badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { deleteBorrower, fetchBorrower, fetchLoansForBorrower } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatError, initials } from '@/lib/utils'
import type { Borrower, LoanWithDetails } from '@/types/database'

export function BorrowerDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [loans, setLoans] = useState<LoanWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [returnLoan, setReturnLoan] = useState<LoanWithDetails | null>(null)

  async function reload() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [nextBorrower, nextLoans] = await Promise.all([fetchBorrower(id), fetchLoansForBorrower(id)])
      setBorrower(nextBorrower)
      setLoans(nextLoans)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [id])

  if (loading) return <Skeleton className="h-72" />
  if (error || !borrower) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Borrower not found"
        description={error ?? 'This person is no longer in your library.'}
        action={
          <Button asChild>
            <Link to="/borrowers">Back to borrowers</Link>
          </Button>
        }
      />
    )
  }

  const active = loans.filter((loan) => !loan.returned_at)

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/borrowers">
          <ArrowLeft className="size-4" />
          Borrowers
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary font-serif text-xl text-primary">
            {initials(borrower.name)}
          </div>
          <div>
            <h1 className="font-serif text-3xl">{borrower.name}</h1>
            <p className="text-sm text-muted-foreground">
              Added {formatDate(borrower.created_at)}
              {borrower.email ? ` · ${borrower.email}` : ''}
              {borrower.phone ? ` · ${borrower.phone}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Currently borrowing</p>
            <p className="font-serif text-3xl">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total borrowed</p>
            <p className="font-serif text-3xl">{loans.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl">Active loans</h2>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is currently checked out.</p>
          ) : (
            <div className="divide-y divide-border">
              {active.map((loan) => (
                <div key={loan.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/books/${loan.copy.book.id}`} className="font-medium hover:underline">
                      {loan.copy.book.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {loan.copy.copy_code}
                      {loan.due_date ? ` · Due ${formatDate(loan.due_date)}` : ''}
                    </p>
                  </div>
                  <LoanStatusBadge dueDate={loan.due_date} returnedAt={loan.returned_at} />
                  <Button size="sm" variant="outline" onClick={() => setReturnLoan(loan)}>
                    Return
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl">Borrowing history</h2>
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books have been issued to {borrower.name} yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Book</th>
                    <th className="pb-3 font-medium">Copy</th>
                    <th className="pb-3 font-medium">Issued</th>
                    <th className="pb-3 font-medium">Due</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-t border-border">
                      <td className="py-3">
                        <Link to={`/books/${loan.copy.book.id}`} className="hover:underline">
                          {loan.copy.book.title}
                        </Link>
                      </td>
                      <td>{loan.copy.copy_code}</td>
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

      <BorrowerFormDialog open={editOpen} onOpenChange={setEditOpen} borrower={borrower} onSaved={reload} />
      <ReturnBookDialog
        open={Boolean(returnLoan)}
        onOpenChange={(open) => !open && setReturnLoan(null)}
        loan={returnLoan}
        onReturned={reload}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {borrower.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Borrowers with loan history cannot be removed, so past issues stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteBorrower(borrower.id)
                  toast.success('Borrower deleted')
                  navigate('/borrowers')
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
