// components/admin/revenue-chart.tsx
'use client'

import { useMemo } from 'react'

interface RevenueChartProps {
  data: Array<{
    date: string
    revenue: number
  }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { points: '', maxRevenue: 0, totalRevenue: 0 }

    const maxRevenue = Math.max(...data.map(d => d.revenue))
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    
    const width = 400
    const height = 200
    const padding = 40
    
    const xStep = (width - padding * 2) / Math.max(1, data.length - 1)
    const yScale = (height - padding * 2) / maxRevenue
    
    const points = data
      .map((item, index) => {
        const x = padding + index * xStep
        const y = height - padding - item.revenue * yScale
        return `${x},${y}`
      })
      .join(' ')
    
    return { points, maxRevenue, totalRevenue }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <p>No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Total Revenue (30 days)</p>
          <p className="text-lg font-semibold text-gray-900">
            ${chartData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Peak Day</p>
          <p className="text-lg font-semibold text-gray-900">
            ${chartData.maxRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      <div className="relative">
        <svg width="100%" height="200" viewBox="0 0 400 200" className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Revenue line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={chartData.points}
          />
          
          {/* Area under curve */}
          <polygon
            fill="url(#gradient)"
            points={`40,160 ${chartData.points} 360,160`}
            opacity="0.1"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = 40 + index * ((400 - 80) / Math.max(1, data.length - 1))
            const y = 160 - (item.revenue * (120 / chartData.maxRevenue))
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2"
                className="hover:r-6 transition-all cursor-pointer"
              >
                <title>${item.revenue.toFixed(2)} on {item.date}</title>
              </circle>
            )
          })}
        </svg>
      </div>
    </div>
  )
}