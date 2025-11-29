
// hooks/useDashboardFilters.ts - For filtering and date range selection
import { useState, useMemo } from 'react'

export type DateRange = '7d' | '30d' | '90d' | '1y' | 'all'

export function useDashboardFilters() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const dateRangeInDays = useMemo(() => {
    switch (dateRange) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return null
    }
  }, [dateRange])

  const reset = () => {
    setDateRange('30d')
    setSelectedStatus(null)
    setSearchQuery('')
  }

  return {
    dateRange,
    setDateRange,
    dateRangeInDays,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    reset
  }
}

