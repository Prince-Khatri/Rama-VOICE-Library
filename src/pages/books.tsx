import { BookOpen, LayoutGrid, List, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookFormDialog } from '@/components/forms/book-form-dialog'
import { BookCover } from '@/components/shared/book-cover'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { BookAvailabilityBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/hooks/use-library'
import { cn } from '@/lib/utils'
import type { BookWithStats } from '@/types/database'

type Availability = 'all' | 'available' | 'unavailable'
type SortKey = 'recent' | 'title' | 'author'

export function BooksPage() {
  const { books, loading, error, reload } = useLibrary()
  const [params, setParams] = useSearchParams()
  const [titleQuery, setTitleQuery] = useState(params.get('q') ?? '')
  const [authorQuery, setAuthorQuery] = useState('')
  const [availability, setAvailability] = useState<Availability>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const title = titleQuery.trim().toLowerCase()
    const author = authorQuery.trim().toLowerCase()
    return books
      .filter((book) => (title ? book.title.toLowerCase().includes(title) : true))
      .filter((book) => (author ? book.author.toLowerCase().includes(author) : true))
      .filter((book) => {
        if (availability === 'available') return book.available_copies > 0
        if (availability === 'unavailable') return book.available_copies === 0
        return true
      })
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title)
        if (sort === 'author') return a.author.localeCompare(b.author)
        return a.created_at < b.created_at ? 1 : -1
      })
  }, [authorQuery, availability, books, sort, titleQuery])

  return (
    <div>
      <PageHeader
        title="Books"
        description="Srila Prabhupada’s books, kept for VOICE students."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add book
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-12">
        <div className="relative md:col-span-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={titleQuery}
            onChange={(event) => {
              setTitleQuery(event.target.value)
              setParams(event.target.value ? { q: event.target.value } : {})
            }}
            placeholder="Search by title"
            className="pl-9"
          />
        </div>
        <Input
          className="md:col-span-3"
          value={authorQuery}
          onChange={(event) => setAuthorQuery(event.target.value)}
          placeholder="Search by author"
        />
        <Select value={availability} onValueChange={(value) => setAvailability(value as Availability)}>
          <SelectTrigger className="md:col-span-2">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All books</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="md:col-span-2">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="author">Author</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border border-border bg-card p-1 md:col-span-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={cn('flex flex-1 items-center justify-center rounded-md py-1', view === 'grid' && 'bg-secondary')}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn('flex flex-1 items-center justify-center rounded-md py-1', view === 'list' && 'bg-secondary')}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={BookOpen} title="Couldn’t load books" description={error} action={<Button onClick={() => void reload()}>Try again</Button>} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books on the shelves"
          description="Add a title from Srila Prabhupada’s catalog to get started."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Add book
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching books" description="Try a different title, author, or availability filter." />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((book) => (
              <Link key={book.id} to={`/books/${book.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/50">
                <BookCover title={book.title} coverUrl={book.cover_url} className="h-14 w-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{book.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{book.author}</p>
                </div>
                <p className="hidden text-sm text-muted-foreground sm:block">{book.total_copies} copies</p>
                <p className="hidden text-sm text-muted-foreground md:block">{book.available_copies} available</p>
                <BookAvailabilityBadge available={book.available_copies} total={book.total_copies} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <BookFormDialog open={open} onOpenChange={setOpen} onSaved={reload} />
    </div>
  )
}

function BookCard({ book }: { book: BookWithStats }) {
  return (
    <Link to={`/books/${book.id}`} className="group">
      <Card className="h-full transition-transform group-hover:-translate-y-0.5">
        <CardContent className="flex gap-4 p-5">
          <BookCover title={book.title} coverUrl={book.cover_url} className="h-28 w-20 shrink-0" />
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-medium">{book.title}</h3>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{book.author}</p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>{book.total_copies} {book.total_copies === 1 ? 'copy' : 'copies'}</p>
              <p>{book.available_copies} available</p>
              <p>{book.borrowed_copies} borrowed</p>
            </div>
            <div className="mt-3">
              <BookAvailabilityBadge available={book.available_copies} total={book.total_copies} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
