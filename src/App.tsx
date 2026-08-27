import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { useAuth } from '@/contexts/auth-context'
import { BookDetailsPage } from '@/pages/book-details'
import { BooksPage } from '@/pages/books'
import { BorrowerDetailsPage } from '@/pages/borrower-details'
import { BorrowersPage } from '@/pages/borrowers'
import { DashboardPage } from '@/pages/dashboard'
import { ImportPage } from '@/pages/import'
import { LoansPage } from '@/pages/loans'
import { LoginPage } from '@/pages/login'
import { SettingsPage } from '@/pages/settings'

function Protected() {
  const { configured, loading, user } = useAuth()
  if (!configured) return <Navigate to="/login" replace />
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Opening your library…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="books/:id" element={<BookDetailsPage />} />
          <Route path="borrowers" element={<BorrowersPage />} />
          <Route path="borrowers/:id" element={<BorrowerDetailsPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
