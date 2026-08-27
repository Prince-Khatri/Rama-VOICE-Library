import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Upload,
  Users,
  Bookmark,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/books', label: 'Books', icon: BookOpen },
  { to: '/borrowers', label: 'Borrowers', icon: Users },
  { to: '/loans', label: 'Loans', icon: Bookmark },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground',
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <BookOpen className="size-4" />
      </div>
      <div>
        <p className="font-serif text-xl leading-none">Vani</p>
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">VOICE library</p>
      </div>
    </div>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      <div className="h-1 bg-linear-to-r from-[#C45C26] via-[#E2B56A] to-[#C45C26]" />
      <div className="mx-auto flex min-h-[calc(100svh-4px)] max-w-[1400px]">
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
          <Brand />
          <div className="mt-8 flex-1">
            <NavItems />
          </div>
          <p className="px-3 text-xs text-muted-foreground">{user?.email}</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <form
              className="relative max-w-md flex-1"
              onSubmit={(event) => {
                event.preventDefault()
                navigate(query.trim() ? `/books?q=${encodeURIComponent(query.trim())}` : '/books')
              }}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search books..."
                className="pl-9"
              />
            </form>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut()
                navigate('/login')
              }}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </header>

          <main className="flex-1 px-4 py-8 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <Brand />
          <div className="mt-8">
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
