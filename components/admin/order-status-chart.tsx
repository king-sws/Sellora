// components/admin/order-status-chart.tsx
'use client'

interface OrderStatusChartProps {
  data: Array<{
    status: string
    _count: {
      id: number
    }
  }>
}

const statusColors = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7' },
  CONFIRMED: { color: '#3b82f6', bg: '#dbeafe' },
  PROCESSING: { color: '#8b5cf6', bg: '#ede9fe' },
  SHIPPED: { color: '#06b6d4', bg: '#cffafe' },
  DELIVERED: { color: '#10b981', bg: '#d1fae5' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2' },
  REFUNDED: { color: '#6b7280', bg: '#f3f4f6' }
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item._count.id, 0)
  
  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <p>No order data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        {data.map((item) => {
          const percentage = ((item._count.id / total) * 100).toFixed(1)
          const statusColor = statusColors[item.status as keyof typeof statusColors] || statusColors.PENDING
          
          return (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: statusColor.color }}
                />
                <span className="text-sm text-gray-600 capitalize">
                  {item.status.toLowerCase()}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {item._count.id}
                </div>
                <div className="text-xs text-gray-500">
                  {percentage}%
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {data.map((item) => {
          const percentage = (item._count.id / total) * 100
          const statusColor = statusColors[item.status as keyof typeof statusColors] || statusColors.PENDING
          
          return (
            <div key={item.status} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span className="capitalize">{item.status.toLowerCase()}</span>
                <span>{item._count.id} orders</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: statusColor.color 
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between text-sm font-medium">
          <span>Total Orders</span>
          <span>{total}</span>
        </div>
      </div>
    </div>
  )
}