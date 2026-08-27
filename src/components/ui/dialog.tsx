import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}

function DialogPortal({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />
}

function DialogClose({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px]', className)}
      {...props}
    />
  )
}

function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border bg-card p-6 surface-shadow',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('font-serif text-xl font-semibold', className)} {...props} />
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
