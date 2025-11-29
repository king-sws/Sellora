// lib/review-utils.ts - Utility functions for reviews
export const RATING_COLORS = {
  1: 'text-red-600 bg-red-100',
  2: 'text-orange-600 bg-orange-100',
  3: 'text-yellow-600 bg-yellow-100',
  4: 'text-blue-600 bg-blue-100',
  5: 'text-green-600 bg-green-100'
} as const

export const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair', 
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
} as const

export function getRatingColor(rating: number): string {
  return RATING_COLORS[rating as keyof typeof RATING_COLORS] || 'text-gray-600 bg-gray-100'
}

export function getRatingLabel(rating: number): string {
  return RATING_LABELS[rating as keyof typeof RATING_LABELS] || 'Unknown'
}

export function calculateAverageRating(reviews: Array<{ rating: number }>): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

export function getReviewsSummary(reviews: Array<{ rating: number; isVerified: boolean }>) {
  const total = reviews.length
  const averageRating = calculateAverageRating(reviews)
  const verifiedCount = reviews.filter(r => r.isVerified).length
  const verificationRate = total > 0 ? (verifiedCount / total) * 100 : 0
  
  const distribution = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  return {
    total,
    averageRating,
    verifiedCount,
    verificationRate,
    distribution: {
      5: distribution[5] || 0,
      4: distribution[4] || 0,
      3: distribution[3] || 0,
      2: distribution[2] || 0,
      1: distribution[1] || 0
    }
  }
}