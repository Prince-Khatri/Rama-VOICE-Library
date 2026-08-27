import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function initials(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return 'BK'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Something went wrong. Please try again.'
}
