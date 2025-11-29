// components/TopNotice.tsx
import * as React from 'react'
import { Megaphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TopNoticeProps {
  message: string
  className?: string
}

export const TopNotice: React.FC<TopNoticeProps> = ({ message, className }) => {
  const [isVisible, setIsVisible] = React.useState(true)

  if (!isVisible) return null

  return (
    <div className={cn(
      'bg-primary text-primary-foreground text-center py-2 text-sm font-medium transition-all duration-300 ease-in-out flex items-center justify-center relative px-4',
      className
    )}>
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(false)}
        className="absolute right-2 h-7 w-7 text-primary-foreground/80 hover:bg-primary/80 hover:text-primary-foreground"
        aria-label="Close notice"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}