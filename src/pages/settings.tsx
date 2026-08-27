import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import { fetchSettings, updateSettings } from '@/lib/api'
import { formatError } from '@/lib/utils'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const [libraryName, setLibraryName] = useState('Rama')
  const [defaultLoanDays, setDefaultLoanDays] = useState(14)
  const [dueDatesEnabled, setDueDatesEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
      .then((settings) => {
        if (!settings) return
        setLibraryName(settings.library_name)
        setDefaultLoanDays(settings.default_loan_days)
        setDueDatesEnabled(settings.due_dates_enabled)
      })
      .catch((err: unknown) => toast.error(formatError(err)))
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await updateSettings({
        library_name: libraryName.trim() || 'Rama',
        default_loan_days: Math.max(1, defaultLoanDays),
        due_dates_enabled: dueDatesEnabled,
      })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Defaults for issuing books to VOICE students." />

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Library</CardTitle>
            <CardDescription>Used for the default loan period when you issue a book.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="library-name">Library name</Label>
              <Input id="library-name" value={libraryName} onChange={(event) => setLibraryName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loan-days">Default loan length (days)</Label>
              <Input
                id="loan-days"
                type="number"
                min={1}
                value={defaultLoanDays}
                onChange={(event) => setDefaultLoanDays(Number(event.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <div>
                <p className="text-sm font-medium">Due dates</p>
                <p className="text-xs text-muted-foreground">Turn off if you lend without deadlines.</p>
              </div>
              <Switch checked={dueDatesEnabled} onCheckedChange={setDueDatesEnabled} />
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in with email and password through Supabase Auth.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm">{user?.email}</p>
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              Log out
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
