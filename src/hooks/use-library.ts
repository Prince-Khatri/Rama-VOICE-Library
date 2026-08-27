import { useCallback, useEffect, useState } from 'react'
import { fetchBooks, fetchBorrowers, fetchLoans, fetchSettings } from '@/lib/api'
import { formatError } from '@/lib/utils'
import type { BookWithStats, Borrower, LibrarySettings, LoanWithDetails } from '@/types/database'

export function useLibrary() {
  const [books, setBooks] = useState<BookWithStats[]>([])
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loans, setLoans] = useState<LoanWithDetails[]>([])
  const [settings, setSettings] = useState<LibrarySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextBooks, nextBorrowers, nextLoans, nextSettings] = await Promise.all([
        fetchBooks(),
        fetchBorrowers(),
        fetchLoans(),
        fetchSettings(),
      ])
      setBooks(nextBooks)
      setBorrowers(nextBorrowers)
      setLoans(nextLoans)
      setSettings(nextSettings)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { books, borrowers, loans, settings, loading, error, reload }
}
