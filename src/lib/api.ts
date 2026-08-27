import { generateCopyCodes, nextCopyCode, prefixFromTitle } from '@/lib/copy-codes'
import { isOverdue } from '@/lib/dates'
import { getSupabase } from '@/lib/supabase'
import type {
  ActivityItem,
  Book,
  BookCopy,
  BookFormValues,
  BookWithStats,
  Borrower,
  BorrowerFormValues,
  CopyStatus,
  DashboardStats,
  LibrarySettings,
  Loan,
  LoanWithDetails,
} from '@/types/database'

type CopyRow = BookCopy
type BookRow = Book
type BorrowerRow = Borrower

function withStats(book: BookRow, copies: CopyRow[]): BookWithStats {
  return {
    ...book,
    copies,
    total_copies: copies.length,
    available_copies: copies.filter((copy) => copy.status === 'AVAILABLE').length,
    borrowed_copies: copies.filter((copy) => copy.status === 'BORROWED').length,
  }
}

function mapLoan(row: {
  id: string
  copy_id: string
  borrower_id: string
  borrowed_at: string
  due_date: string | null
  returned_at: string | null
  created_at: string
  book_copies: (CopyRow & { books: BookRow }) | (CopyRow & { books: BookRow })[] | null
  borrowers: BorrowerRow | BorrowerRow[] | null
}): LoanWithDetails {
  const copyRaw = Array.isArray(row.book_copies) ? row.book_copies[0] : row.book_copies
  const borrowerRaw = Array.isArray(row.borrowers) ? row.borrowers[0] : row.borrowers
  if (!copyRaw || !borrowerRaw) {
    throw new Error('Loan is missing related book or borrower data.')
  }
  const { books, ...copy } = copyRaw
  return {
    id: row.id,
    copy_id: row.copy_id,
    borrower_id: row.borrower_id,
    borrowed_at: row.borrowed_at,
    due_date: row.due_date,
    returned_at: row.returned_at,
    created_at: row.created_at,
    copy: { ...copy, book: books },
    borrower: borrowerRaw,
  }
}

const LOAN_SELECT = `
  id, copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at,
  book_copies (id, book_id, copy_code, status, created_at, updated_at, books (*)),
  borrowers (*)
`

export async function fetchBooks(): Promise<BookWithStats[]> {
  const supabase = getSupabase()
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const { data: copies, error: copiesError } = await supabase
    .from('book_copies')
    .select('*')
    .order('copy_code')
  if (copiesError) throw copiesError

  const copiesByBook = new Map<string, CopyRow[]>()
  for (const copy of (copies ?? []) as CopyRow[]) {
    const list = copiesByBook.get(copy.book_id) ?? []
    list.push(copy)
    copiesByBook.set(copy.book_id, list)
  }

  return ((books ?? []) as BookRow[]).map((book) => withStats(book, copiesByBook.get(book.id) ?? []))
}

export async function fetchBook(id: string): Promise<BookWithStats> {
  const supabase = getSupabase()
  const { data: book, error } = await supabase.from('books').select('*').eq('id', id).single()
  if (error) throw error
  const { data: copies, error: copiesError } = await supabase
    .from('book_copies')
    .select('*')
    .eq('book_id', id)
    .order('copy_code')
  if (copiesError) throw copiesError
  return withStats(book as BookRow, (copies ?? []) as CopyRow[])
}

export async function findBookByTitleAuthor(title: string, author: string): Promise<Book | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .ilike('title', title.trim())
    .ilike('author', author.trim())
    .maybeSingle()
  if (error) throw error
  return (data as Book | null) ?? null
}

export async function createBook(values: BookFormValues): Promise<BookWithStats> {
  const supabase = getSupabase()
  const existing = await findBookByTitleAuthor(values.title, values.author)
  if (existing) {
    throw new Error(`“${values.title}” by ${values.author} is already in your library.`)
  }

  const { data: allCodes, error: codesError } = await supabase.from('book_copies').select('copy_code')
  if (codesError) throw codesError

  const { data: book, error } = await supabase
    .from('books')
    .insert({
      title: values.title.trim(),
      author: values.author.trim(),
      description: values.description.trim() || null,
      cover_url: values.cover_url.trim() || null,
    })
    .select('*')
    .single()
  if (error) throw error

  const reserved = ((allCodes ?? []) as { copy_code: string }[]).map((row) => row.copy_code)
  const codes = generateCopyCodes(values.title, Math.max(1, values.copies), reserved)
  const { data: copies, error: copiesError } = await supabase
    .from('book_copies')
    .insert(codes.map((copy_code) => ({ book_id: (book as Book).id, copy_code, status: 'AVAILABLE' as const })))
    .select('*')
  if (copiesError) {
    await supabase.from('books').delete().eq('id', (book as Book).id)
    throw copiesError
  }

  return withStats(book as BookRow, (copies ?? []) as CopyRow[])
}

export async function updateBook(
  id: string,
  values: Pick<BookFormValues, 'title' | 'author' | 'description' | 'cover_url'>,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('books')
    .update({
      title: values.title.trim(),
      author: values.author.trim(),
      description: values.description.trim() || null,
      cover_url: values.cover_url.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteBook(id: string): Promise<void> {
  const supabase = getSupabase()
  const { data: copies, error: copiesError } = await supabase
    .from('book_copies')
    .select('id')
    .eq('book_id', id)
  if (copiesError) throw copiesError

  const copyIds = ((copies ?? []) as { id: string }[]).map((row) => row.id)
  if (copyIds.length > 0) {
    const { count, error: loanError } = await supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .in('copy_id', copyIds)
    if (loanError) throw loanError
    if ((count ?? 0) > 0) {
      throw new Error('This book has borrowing history, so it cannot be deleted. Keep the record and mark copies lost if needed.')
    }
    const { error: deleteCopiesError } = await supabase.from('book_copies').delete().eq('book_id', id)
    if (deleteCopiesError) throw deleteCopiesError
  }

  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
}

export async function addCopy(book: BookWithStats): Promise<BookCopy> {
  const supabase = getSupabase()
  const { data: allCodes, error: codesError } = await supabase.from('book_copies').select('copy_code')
  if (codesError) throw codesError
  const prefix = prefixFromTitle(book.title)
  const code = nextCopyCode(
    prefix,
    ((allCodes ?? []) as { copy_code: string }[]).map((row) => row.copy_code),
  )
  const { data, error } = await supabase
    .from('book_copies')
    .insert({ book_id: book.id, copy_code: code, status: 'AVAILABLE' })
    .select('*')
    .single()
  if (error) throw error
  return data as BookCopy
}

export async function removeCopy(copy: BookCopy): Promise<void> {
  if (copy.status === 'BORROWED') {
    throw new Error('Return this copy before removing it.')
  }
  const supabase = getSupabase()
  const { count, error: loanError } = await supabase
    .from('loans')
    .select('id', { count: 'exact', head: true })
    .eq('copy_id', copy.id)
  if (loanError) throw loanError
  if ((count ?? 0) > 0) {
    throw new Error('This copy has borrowing history, so it cannot be removed. Mark it lost or damaged instead.')
  }
  const { error } = await supabase.from('book_copies').delete().eq('id', copy.id)
  if (error) throw error
}

export async function updateCopyStatus(copy: BookCopy, status: CopyStatus): Promise<void> {
  if (copy.status === 'BORROWED' && status !== 'BORROWED') {
    throw new Error('Return this copy before changing its condition.')
  }
  const supabase = getSupabase()
  const { error } = await supabase.from('book_copies').update({ status }).eq('id', copy.id)
  if (error) throw error
}

export async function fetchBorrowers(): Promise<Borrower[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('borrowers').select('*').order('name')
  if (error) throw error
  return (data ?? []) as Borrower[]
}

export async function fetchBorrower(id: string): Promise<Borrower> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('borrowers').select('*').eq('id', id).single()
  if (error) throw error
  return data as Borrower
}

export async function createBorrower(values: BorrowerFormValues): Promise<Borrower> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('borrowers')
    .insert({
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Borrower
}

export async function updateBorrower(id: string, values: BorrowerFormValues): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('borrowers')
    .update({
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteBorrower(id: string): Promise<void> {
  const supabase = getSupabase()
  const { count, error: loanError } = await supabase
    .from('loans')
    .select('id', { count: 'exact', head: true })
    .eq('borrower_id', id)
  if (loanError) throw loanError
  if ((count ?? 0) > 0) {
    throw new Error('This borrower has loan history and cannot be deleted.')
  }
  const { error } = await supabase.from('borrowers').delete().eq('id', id)
  if (error) throw error
}

export async function fetchLoans(): Promise<LoanWithDetails[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .order('borrowed_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as Parameters<typeof mapLoan>[0][]).map(mapLoan)
}

export async function fetchLoansForBook(bookId: string): Promise<LoanWithDetails[]> {
  const loans = await fetchLoans()
  return loans.filter((loan) => loan.copy.book_id === bookId)
}

export async function fetchLoansForBorrower(borrowerId: string): Promise<LoanWithDetails[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .eq('borrower_id', borrowerId)
    .order('borrowed_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as Parameters<typeof mapLoan>[0][]).map(mapLoan)
}

export async function issueBook(input: {
  bookId: string
  borrowerId: string
  dueDate: string | null
  copyId?: string
}): Promise<Loan> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('issue_book', {
    p_book_id: input.bookId,
    p_borrower_id: input.borrowerId,
    p_due_date: input.dueDate,
    p_copy_id: input.copyId ?? null,
  })
  if (error) throw new Error(error.message)
  return data as Loan
}

export async function returnBook(loanId: string): Promise<Loan> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('return_book', { p_loan_id: loanId })
  if (error) throw new Error(error.message)
  return data as Loan
}

export async function fetchSettings(): Promise<LibrarySettings | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('library_settings').select('*').limit(1).maybeSingle()
  if (error) throw error
  return (data as LibrarySettings | null) ?? null
}

export async function updateSettings(values: Pick<LibrarySettings, 'library_name' | 'default_loan_days' | 'due_dates_enabled'>): Promise<void> {
  const supabase = getSupabase()
  const existing = await fetchSettings()
  if (existing) {
    const { error } = await supabase.from('library_settings').update(values).eq('id', existing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('library_settings').insert(values)
  if (error) throw error
}

export function buildDashboard(books: BookWithStats[], borrowers: Borrower[], loans: LoanWithDetails[]): {
  stats: DashboardStats
  activity: ActivityItem[]
  activeLoans: LoanWithDetails[]
  overdueLoans: LoanWithDetails[]
} {
  const copies = books.flatMap((book) => book.copies)
  const overdueLoans = loans.filter((loan) => isOverdue(loan.due_date, loan.returned_at))
  const activeLoans = loans.filter((loan) => !loan.returned_at)

  const activity: ActivityItem[] = [
    ...books.map((book) => ({
      id: `book-${book.id}`,
      kind: 'added' as const,
      title: book.title,
      detail: `Added “${book.title}”`,
      at: book.created_at,
    })),
    ...loans.map((loan) => ({
      id: `borrowed-${loan.id}`,
      kind: 'borrowed' as const,
      title: loan.copy.book.title,
      detail: `${loan.borrower.name} borrowed “${loan.copy.book.title}”`,
      at: loan.borrowed_at,
    })),
    ...loans
      .filter((loan) => loan.returned_at)
      .map((loan) => ({
        id: `returned-${loan.id}`,
        kind: 'returned' as const,
        title: loan.copy.book.title,
        detail: `${loan.borrower.name} returned “${loan.copy.book.title}”`,
        at: loan.returned_at as string,
      })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8)

  return {
    stats: {
      totalBooks: books.length,
      totalCopies: copies.length,
      availableCopies: copies.filter((copy) => copy.status === 'AVAILABLE').length,
      borrowedCopies: copies.filter((copy) => copy.status === 'BORROWED').length,
      borrowerCount: borrowers.length,
      overdueCount: overdueLoans.length,
    },
    activity,
    activeLoans,
    overdueLoans,
  }
}

export async function importBooks(
  rows: { title: string; author: string; copies: number }[],
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    const existing = await findBookByTitleAuthor(row.title, row.author)
    if (existing) {
      skipped += 1
      continue
    }
    await createBook({
      title: row.title,
      author: row.author,
      description: '',
      cover_url: '',
      copies: row.copies,
    })
    imported += 1
  }
  return { imported, skipped }
}
