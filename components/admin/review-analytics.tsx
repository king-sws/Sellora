/* eslint-disable @typescript-eslint/no-explicit-any */
// components/admin/review-analytics.tsx
'use client'

import { useEffect, useState } from 'react'
import { 
  Star, TrendingUp, TrendingDown, 
  Users, Award, AlertTriangle 
} from 'lucide-react'
import { Stars } from '@/components/ui/stars'

interface ReviewAnalytics {
  totalReviews: number
  averageRating: number
  ratingTrend: number
  verifiedPercentage: number
  monthlyReviews: Array<{ month: string; count: number; avgRating: number }>
  topRatedProducts: Array<{
    id: string
    name: string
    avgRating: number
    reviewCount: number
    images: string[]
  }>
  recentTrends: {
    thisMonth: { reviews: number; avgRating: number }
    lastMonth: { reviews: number; avgRating: number }
    growth: number
  }
}

export function ReviewAnalytics() {
  const [data, setData] = useState<ReviewAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/reviews/analytics')
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Error fetching review analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Failed to load review analytics</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.totalReviews.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {data.averageRating.toFixed(1)}
                </p>
                <Stars rating={data.averageRating} size="sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified Reviews</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.verifiedPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              data.ratingTrend >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {data.ratingTrend >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rating Trend</p>
              <p className={`text-2xl font-bold ${
                data.ratingTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.ratingTrend >= 0 ? '+' : ''}{data.ratingTrend.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Review Trends</h3>
        <div className="space-y-4">
          {data.monthlyReviews.map((month, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{month.month}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">{month.count} reviews</span>
                  <span className="text-gray-300">•</span>
                  <Stars rating={month.avgRating} size="xs" showValue />
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      {month.count > data.monthlyReviews[index - 1].count ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">
                            +{((month.count - data.monthlyReviews[index - 1].count) / data.monthlyReviews[index - 1].count * 100).toFixed(1)}%
                          </span>
                        </>
                      ) : month.count < data.monthlyReviews[index - 1].count ? (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-red-600">
                            {((month.count - data.monthlyReviews[index - 1].count) / data.monthlyReviews[index - 1].count * 100).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">No change</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Rated Products */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Rated Products</h3>
        <div className="space-y-4">
          {data.topRatedProducts.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 text-lg font-bold text-gray-400 w-8">
                  #{index + 1}
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                  <p className="text-sm text-gray-600">{product.reviewCount} reviews</p>
                </div>
              </div>
              <div className="text-right">
                <Stars rating={product.avgRating} size="sm" showValue />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-600 mb-2">This Month</p>
            <p className="text-2xl font-bold text-blue-900">
              {data.recentTrends.thisMonth.reviews}
            </p>
            <p className="text-sm text-blue-700">
              Avg: {data.recentTrends.thisMonth.avgRating.toFixed(1)} ⭐
            </p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600 mb-2">Last Month</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.recentTrends.lastMonth.reviews}
            </p>
            <p className="text-sm text-gray-700">
              Avg: {data.recentTrends.lastMonth.avgRating.toFixed(1)} ⭐
            </p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-600 mb-2">Growth</p>
            <p className={`text-2xl font-bold ${
              data.recentTrends.growth >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {data.recentTrends.growth >= 0 ? '+' : ''}{data.recentTrends.growth.toFixed(1)}%
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {data.recentTrends.growth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-600">vs last month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}