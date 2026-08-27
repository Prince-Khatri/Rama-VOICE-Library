import { BookOpen } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { formatError } from '@/lib/utils'

export function LoginPage() {
  const { configured, user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setInfo('Account created. If email confirmation is enabled, check your inbox before signing in.')
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#C45C26] via-[#E2B56A] to-[#C45C26]" />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </div>
          <h1 className="font-serif text-5xl">Rama</h1>
          <p className="mt-2 text-sm text-muted-foreground">The library of VOICE — Vedic Oasis of Culture and Ethics.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {!configured ? (
              <div className="space-y-3 text-sm">
                <p className="font-medium">Connect Supabase to continue</p>
                <p className="text-muted-foreground">
                  Create a <code className="rounded bg-muted px-1.5 py-0.5">.env</code> file from
                  {' '}<code className="rounded bg-muted px-1.5 py-0.5">.env.example</code> and add
                  {' '}<code className="rounded bg-muted px-1.5 py-0.5">VITE_SUPABASE_URL</code> and
                  {' '}<code className="rounded bg-muted px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code>.
                  Then run the SQL in <code className="rounded bg-muted px-1.5 py-0.5">supabase/migrations/001_schema.sql</code>.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {info ? <p className="text-sm text-primary">{info}</p> : null}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                  {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
