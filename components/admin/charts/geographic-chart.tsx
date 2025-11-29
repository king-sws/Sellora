// components/admin/charts/geographic-chart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPrice } from '@/lib/utils'

interface GeographicChartProps {
  data: Array<{
    state: string
    country: string
    order_count: number
    total_revenue: number
  }>
}

export function GeographicChart({ data }: GeographicChartProps) {
  const chartData = data.slice(0, 10).map(item => ({
    location: `${item.state}, ${item.country}`,
    orders: item.order_count,
    revenue: item.total_revenue
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            Orders: {payload[0].value}
          </p>
          <p className="text-sm text-green-600">
            Revenue: {formatPrice(payload[1]?.value || 0)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="location" 
            stroke="#666" 
            fontSize={10}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="orders" fill="#06b6d4" name="Orders" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}