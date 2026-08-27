import { Bookmark } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReturnBookDialog } from '@/components/forms/return-book-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { LoanStatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/hooks/use-library'
import { formatDate } from '@/lib/dates'
import { isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { LoanWithDetails } from '@/types/database'

type Filter = 'all' | 'borrowed' | 'returned' | 'overdue'

export function LoansPage() {
  const { loans, loading, error, reload } = useLibrary()
  const [filter, setFilter] = useState<Filter>('all')
  const [returnLoan, setReturnLoan] = useState<LoanWithDetails | null>(null)

  const filtered = useMemo(() => {
    return loans.filter((loan) => {
      if (filter === 'borrowed') return !loan.returned_at
      if (filter === 'returned') return Boolean(loan.returned_at)
      if (filter === 'overdue') return isOverdue(loan.due_date, loan.returned_at)
      return true
    })
  }, [filter, loans])

  return (
    <div>
      <PageHeader title="Loans" description="Every issue and return, with overdue status calculated from the due date." />

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ['all', 'All'],
          ['borrowed', 'Currently borrowed'],
          ['returned', 'Returned'],
          ['overdue', 'Overdue'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              filter === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <EmptyState icon={Bookmark} title="Couldn’t load loans" description={error} action={<Button onClick={() => void reload()}>Try again</Button>} />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No loans yet"
          description="Issue a book from the dashboard or a book page to start a history."
          action={
            <Button asChild>
              <Link to="/books">Browse books</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing in this view" description="Try another filter." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">Book</th>
                  <th className="px-5 py-3 font-medium">Borrower</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <tr key={loan.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <Link to={`/books/${loan.copy.book.id}`} className="font-medium hover:underline">
                        {loan.copy.book.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{loan.copy.copy_code}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/borrowers/${loan.borrower.id}`} className="hover:underline">
                        {loan.borrower.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{formatDate(loan.borrowed_at)}</td>
                    <td className="px-5 py-3">{formatDate(loan.due_date)}</td>
                    <td className="px-5 py-3">
                      <LoanStatusBadge dueDate={loan.due_date} returnedAt={loan.returned_at} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!loan.returned_at ? (
                        <Button size="sm" variant="outline" onClick={() => setReturnLoan(loan)}>
                          Return
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ReturnBookDialog
        open={Boolean(returnLoan)}
        onOpenChange={(open) => !open && setReturnLoan(null)}
        loan={returnLoan}
        onReturned={reload}
      />
    </div>
  )
}
