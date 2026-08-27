import { AlertTriangle, BookMarked, BookOpen, Clock3, Library, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IssueBookDialog } from '@/components/forms/issue-book-dialog'
import { ReturnBookDialog } from '@/components/forms/return-book-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/hooks/use-library'
import { buildDashboard } from '@/lib/api'
import { formatRelative, formatShortDate } from '@/lib/dates'
import { greetingForHour } from '@/lib/utils'
import type { BookWithStats, LoanWithDetails } from '@/types/database'

export function DashboardPage() {
  const { books, borrowers, loans, settings, loading, error, reload } = useLibrary()
  const [issueBook, setIssueBook] = useState<BookWithStats | null>(null)
  const [returnLoan, setReturnLoan] = useState<LoanWithDetails | null>(null)

  const data = useMemo(() => buildDashboard(books, borrowers, loans), [books, borrowers, loans])
  const issuable = books.find((book) => book.available_copies > 0) ?? books[0] ?? null

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn’t load the library"
        description={error}
        action={<Button onClick={() => void reload()}>Try again</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greetingForHour(new Date().getHours())}</p>
          <h1 className="font-serif text-3xl tracking-tight">Here’s what’s happening at Vani.</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/books">
              <Plus className="size-4" />
              Add book
            </Link>
          </Button>
          <Button onClick={() => issuable && setIssueBook(issuable)} disabled={!issuable}>
            Issue book
          </Button>
        </div>
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="The shelves are empty"
          description="Add Srila Prabhupada’s books, or import the VOICE catalog CSV."
          action={
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/books">Add book</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/import">Import CSV</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Books" value={data.stats.totalBooks} icon={BookOpen} />
        <StatCard label="Copies" value={data.stats.totalCopies} icon={Library} />
        <StatCard label="Available" value={data.stats.availableCopies} icon={BookMarked} />
        <StatCard label="Borrowed" value={data.stats.borrowedCopies} icon={Clock3} />
        <StatCard label="Borrowers" value={data.stats.borrowerCount} icon={Users} />
      </div>

      {settings?.due_dates_enabled && data.stats.overdueCount > 0 ? (
        <Card className="border-rose-200 bg-rose-50/70">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 size-5 text-rose-700" />
            <div>
              <p className="font-medium text-rose-900">
                {data.stats.overdueCount} overdue {data.stats.overdueCount === 1 ? 'book' : 'books'}
              </p>
              <p className="text-sm text-rose-800/80">A few copies are past their due date. Return them when they come home.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">Currently borrowed</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/loans">View all</Link>
              </Button>
            </div>
            {data.activeLoans.length === 0 ? (
              <EmptyState
                icon={BookMarked}
                title="No active loans"
                description="All your books are currently available."
                className="border-0 bg-transparent py-10"
              />
            ) : (
              <div className="divide-y divide-border">
                {data.activeLoans.slice(0, 6).map((loan) => (
                  <div key={loan.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{loan.copy.book.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {loan.borrower.name}
                        {loan.due_date ? ` · Due ${formatShortDate(loan.due_date)}` : ''}
                        {loan.copy.copy_code ? ` · ${loan.copy.copy_code}` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setReturnLoan(loan)}>
                      Return
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="mb-4 font-serif text-xl">Recent activity</h2>
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Activity will appear as you add books and issue copies.</p>
            ) : (
              <div className="space-y-4">
                {data.activity.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-primary/50" />
                    <div>
                      <p className="text-sm">{item.detail}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(item.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <IssueBookDialog
        open={Boolean(issueBook)}
        onOpenChange={(open) => !open && setIssueBook(null)}
        book={issueBook}
        borrowers={borrowers}
        settings={settings}
        onIssued={reload}
        onBorrowersChanged={reload}
      />
      <ReturnBookDialog
        open={Boolean(returnLoan)}
        onOpenChange={(open) => !open && setReturnLoan(null)}
        loan={returnLoan}
        onReturned={reload}
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof BookOpen }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-4" />
        </div>
        <p className="font-serif text-3xl">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

