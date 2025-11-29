// hooks/useDashboardData.ts - Custom hook with SWR for caching and auto-refresh

import useSWR from 'swr'
import { DashboardData } from '@/lib/types/dashboard'
import { toast } from 'sonner'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch dashboard data')
  }
  
  return res.json()
}

export function useDashboardData(autoRefresh = false) {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    '/api/admin/dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: autoRefresh ? 60000 : 0, // Auto-refresh every 60s if enabled
      onError: (err) => {
        console.error('Dashboard data error:', err)
        toast.error('Failed to load dashboard data', {
          description: err.message
        })
      },
      onSuccess: () => {
        // Optional: notify on successful refresh
        if (autoRefresh) {
          console.log('Dashboard data refreshed')
        }
      }
    }
  )

  const refresh = async () => {
    try {
      await mutate()
      toast.success('Dashboard refreshed')
    } catch (err) {
      toast.error('Failed to refresh dashboard')
    }
  }

  return {
    data,
    error,
    isLoading,
    refresh,
    isStale: !data && !isLoading && !error
  }
}
