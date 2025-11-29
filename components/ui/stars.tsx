// components/ui/stars.tsx - Reusable stars rating component
import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarsProps {
  rating: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showValue?: boolean
  interactive?: boolean
  onChange?: (rating: number) => void
  className?: string
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
}

export function Stars({ 
  rating, 
  size = 'sm', 
  showValue = false, 
  interactive = false,
  onChange,
  className 
}: StarsProps) {
  const sizeClass = sizeClasses[size]
  
  const handleClick = (starRating: number) => {
    if (interactive && onChange) {
      onChange(starRating)
    }
  }

  const renderStar = (position: number) => {
    const isFilled = position <= rating
    const isHalfFilled = position - 0.5 <= rating && position > rating
    
    if (isFilled) {
      return (
        <Star 
          key={position}
          className={cn(
            sizeClass, 
            'text-yellow-400 fill-current',
            interactive && 'cursor-pointer hover:scale-110 transition-transform'
          )}
          onClick={() => handleClick(position)}
        />
      )
    } else if (isHalfFilled) {
      return (
        <StarHalf 
          key={position}
          className={cn(
            sizeClass, 
            'text-yellow-400 fill-current',
            interactive && 'cursor-pointer hover:scale-110 transition-transform'
          )}
          onClick={() => handleClick(position)}
        />
      )
    } else {
      return (
        <Star 
          key={position}
          className={cn(
            sizeClass, 
            'text-gray-300',
            interactive && 'cursor-pointer hover:scale-110 transition-transform hover:text-yellow-400'
          )}
          onClick={() => handleClick(position)}
        />
      )
    }
  }

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(renderStar)}
      </div>
      {showValue && (
        <span className={cn(
          'ml-2 font-medium text-gray-700',
          size === 'xs' ? 'text-xs' :
          size === 'sm' ? 'text-sm' :
          size === 'md' ? 'text-base' :
          size === 'lg' ? 'text-lg' :
          'text-xl'
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}