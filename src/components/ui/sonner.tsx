import { Toaster as Sonner } from 'sonner'

function Toaster() {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast border-border bg-card text-foreground',
          description: 'text-muted-foreground',
        },
      }}
    />
  )
}

export { Toaster }
