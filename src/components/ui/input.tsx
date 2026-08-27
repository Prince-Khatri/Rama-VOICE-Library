import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
