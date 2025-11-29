// components/admin/charts/top-products-chart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPrice } from '@/lib/utils'

interface TopProductsChartProps {
  data: Array<{
    name: string
    total_sold: number
    total_revenue: number
  }>
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const chartData = data.slice(0, 10).map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    sold: item.total_sold,
    revenue: item.total_revenue
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p className="text-sm text-blue-600">
            Sold: {data.sold} units
          </p>
          <p className="text-sm text-green-600">
            Revenue: {formatPrice(data.revenue)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" stroke="#666" fontSize={12} />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={120}
            stroke="#666" 
            fontSize={10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="sold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}