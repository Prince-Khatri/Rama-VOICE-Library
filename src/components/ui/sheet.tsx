import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Sheet({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function SheetTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}

function SheetContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar p-4',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader }
