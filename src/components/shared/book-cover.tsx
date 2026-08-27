import { useState } from 'react'
import { cn, initials } from '@/lib/utils'

type BookCoverProps = {
  title: string
  coverUrl?: string | null
  className?: string
}

export function BookCover({ title, coverUrl, className }: BookCoverProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(coverUrl) && !failed

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-linear-to-br from-[#C45C26] to-[#8A3B14] shadow-sm',
        className,
      )}
    >
      {showImage ? (
        <img
          src={coverUrl!}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center px-2 text-center text-[#f4efe6]">
          <span className="font-serif text-lg tracking-wide">{initials(title)}</span>
          <span className="mt-1 line-clamp-3 text-[10px] leading-tight opacity-80">{title}</span>
        </div>
      )}
    </div>
  )
}
