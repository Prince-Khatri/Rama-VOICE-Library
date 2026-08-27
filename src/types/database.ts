export type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'LOST' | 'DAMAGED'

export type Book = {
  id: string
  title: string
  author: string
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

export type BookCopy = {
  id: string
  book_id: string
  copy_code: string
  status: CopyStatus
  created_at: string
  updated_at: string
}

export type Borrower = {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export type Loan = {
  id: string
  copy_id: string
  borrower_id: string
  borrowed_at: string
  due_date: string | null
  returned_at: string | null
  created_at: string
}

export type LibrarySettings = {
  id: string
  library_name: string
  default_loan_days: number
  due_dates_enabled: boolean
  created_at: string
  updated_at: string
}

export type BookWithStats = Book & {
  total_copies: number
  available_copies: number
  borrowed_copies: number
  copies: BookCopy[]
}

export type LoanWithDetails = Loan & {
  copy: BookCopy & { book: Book }
  borrower: Borrower
}

export type DashboardStats = {
  totalBooks: number
  totalCopies: number
  availableCopies: number
  borrowedCopies: number
  borrowerCount: number
  overdueCount: number
}

export type ActivityItem = {
  id: string
  kind: 'added' | 'borrowed' | 'returned'
  title: string
  detail: string
  at: string
}

export type BookFormValues = {
  title: string
  author: string
  description: string
  cover_url: string
  copies: number
}

export type BorrowerFormValues = {
  name: string
  email: string
  phone: string
}
