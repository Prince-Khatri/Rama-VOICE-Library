import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type { ComponentProps, HTMLAttributes } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function AlertDialog({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root {...props} />
}

function AlertDialogTrigger({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger {...props} />
}

function AlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px]" />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border bg-card p-6 surface-shadow',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn('font-serif text-xl font-semibold', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function AlertDialogAction({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
}

function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
