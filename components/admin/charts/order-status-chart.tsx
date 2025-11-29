/* eslint-disable @typescript-eslint/no-explicit-any */
// components/admin/charts/order-status-chart.tsx
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface OrderStatusChartProps {
  data: Array<{ status: string; count: number; revenue: number }>
}

const STATUS_COLORS = {
  'PENDING': '#f59e0b',
  'CONFIRMED': '#3b82f6',
  'PROCESSING': '#8b5cf6',
  'SHIPPED': '#06b6d4',
  'DELIVERED': '#10b981',
  'CANCELLED': '#ef4444',
  'REFUNDED': '#6b7280'
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.status}</p>
          <p className="text-sm text-gray-600">
            Orders: {data.count} ({((data.count / payload[0].payload.total) * 100).toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const totalOrders = data.reduce((sum, item) => sum + item.count, 0)
  const chartData = data.map(item => ({
    ...item,
    total: totalOrders,
    percentage: ((item.count / totalOrders) * 100).toFixed(1)
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ status, percentage }) => `${status} (${percentage}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#94a3b8'} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}