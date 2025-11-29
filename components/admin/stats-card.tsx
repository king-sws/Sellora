// components/admin/stats-card.tsx
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  subtitle?: string // Add subtitle support
  color: 'green' | 'blue' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'pink' | 'cyan' | 'amber'
}

const colorConfig = {
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
    trend: 'text-green-600'
  },
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
    trend: 'text-blue-600'
  },
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
    trend: 'text-purple-600'
  },
  orange: {
    bg: 'bg-orange-100',
    icon: 'text-orange-600',
    trend: 'text-orange-600'
  },
  emerald: {
    bg: 'bg-emerald-100',
    icon: 'text-emerald-600',
    trend: 'text-emerald-600'
  },
  indigo: {
    bg: 'bg-indigo-100',
    icon: 'text-indigo-600',
    trend: 'text-indigo-600'
  },
  pink: {
    bg: 'bg-pink-100',
    icon: 'text-pink-600',
    trend: 'text-pink-600'
  },
  cyan: {
    bg: 'bg-cyan-100',
    icon: 'text-cyan-600',
    trend: 'text-cyan-600'
  },
  amber: {
    bg: 'bg-amber-100',
    icon: 'text-amber-600',
    trend: 'text-amber-600'
  }
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel, 
  subtitle,
  color 
}: StatsCardProps) {
  const colors = colorConfig[color]
  const isPositiveTrend = trend !== undefined && trend >= 0
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          
          {/* Show subtitle if provided (instead of or along with trend) */}
          {subtitle && !trend && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          
          {trend !== undefined && (
            <div className="flex items-center text-sm">
              {isPositiveTrend ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={isPositiveTrend ? 'text-green-600' : 'text-red-600'}>
                {isPositiveTrend ? '+' : ''}{trend.toFixed(1)}%
              </span>
              {trendLabel && (
                <span className="text-gray-500 ml-1">{trendLabel}</span>
              )}
            </div>
          )}
          
          {/* Show subtitle below trend if both are provided */}
          {subtitle && trend !== undefined && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  )
}