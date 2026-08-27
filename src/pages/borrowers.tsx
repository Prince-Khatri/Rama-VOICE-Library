import { Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BorrowerFormDialog } from '@/components/forms/borrower-form-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/hooks/use-library'
import { initials } from '@/lib/utils'

export function BorrowersPage() {
  const { borrowers, loans, loading, error, reload } = useLibrary()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    return borrowers
      .filter((borrower) => borrower.name.toLowerCase().includes(query.trim().toLowerCase()))
      .map((borrower) => {
        const theirs = loans.filter((loan) => loan.borrower_id === borrower.id)
        return {
          borrower,
          active: theirs.filter((loan) => !loan.returned_at).length,
          total: theirs.length,
        }
      })
  }, [borrowers, loans, query])

  return (
    <div>
      <PageHeader
        title="Borrowers"
        description="Students at VOICE who borrow from the shelves."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add borrower
          </Button>
        }
      />

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name"
        className="mb-6 max-w-sm"
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : error ? (
        <EmptyState icon={Users} title="Couldn’t load borrowers" description={error} action={<Button onClick={() => void reload()}>Try again</Button>} />
      ) : borrowers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No borrowers yet"
          description="Add a friend or family member before issuing a book."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Add borrower
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No matching borrowers" description="Try a different name." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ borrower, active, total }) => (
            <Link key={borrower.id} to={`/borrowers/${borrower.id}`}>
              <Card className="h-full transition-transform hover:-translate-y-0.5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary font-medium text-primary">
                    {initials(borrower.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{borrower.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Currently borrowing: {active}
                    </p>
                    <p className="text-sm text-muted-foreground">Total borrowed: {total}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <BorrowerFormDialog open={open} onOpenChange={setOpen} onSaved={reload} />
    </div>
  )
}
