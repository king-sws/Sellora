/* eslint-disable @typescript-eslint/no-explicit-any */
// components/store/product-reviews.tsx
'use client'

import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, Flag, ChevronDown } from 'lucide-react'
import Image from 'next/image'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  createdAt: Date
  verified?: boolean
  helpfulCount?: number
  images?: string[]
  user: {
    name: string | null
    image: string | null
  }
}

interface ProductReviewsProps {
  reviews: Review[]
  averageRating: number
  totalReviews: number
  onWriteReview?: () => void
}

export function ProductReviews({ 
  reviews, 
  averageRating, 
  totalReviews,
  onWriteReview 
}: ProductReviewsProps) {
  const [filter, setFilter] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'highest' | 'lowest'>('recent')
  const [showAll, setShowAll] = useState(false)

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter(r => r.rating === rating).length
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
    return { rating, count, percentage }
  })

  // Filter and sort reviews
  let filteredReviews = filter 
    ? reviews.filter(r => r.rating === filter)
    : reviews

  filteredReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'helpful':
        return (b.helpfulCount || 0) - (a.helpfulCount || 0)
      case 'highest':
        return b.rating - a.rating
      case 'lowest':
        return a.rating - b.rating
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const displayedReviews = showAll ? filteredReviews : filteredReviews.slice(0, 5)

  return (
    <div className="border-t pt-12" id="reviews">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold">Customer Reviews</h2>
        <button
          onClick={onWriteReview}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Write a Review
        </button>
      </div>
      
      {/* Reviews Summary Card */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Overall Rating */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-gray-900 mb-2">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= averageRating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
          
          {/* Rating Distribution */}
          <div className="space-y-3">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <button
                key={rating}
                onClick={() => setFilter(filter === rating ? null : rating)}
                className={`flex items-center gap-3 text-sm w-full hover:bg-white/50 p-2 rounded-lg transition ${
                  filter === rating ? 'bg-white shadow-sm' : ''
                }`}
              >
                <span className="font-medium w-8">{rating}</span>
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium text-gray-600">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="recent">Most Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
        
        {filter && (
          <button
            onClick={() => setFilter(null)}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Individual Reviews */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-6">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          
          {/* Show More Button */}
          {filteredReviews.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition font-medium flex items-center justify-center gap-2"
            >
              Show All {filteredReviews.length} Reviews
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {filter ? `No ${filter}-star reviews yet` : 'No reviews yet'}
          </p>
          <p className="text-gray-400 mb-6">
            Be the first to share your experience!
          </p>
          <button
            onClick={onWriteReview}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Write a Review
          </button>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [showFullComment, setShowFullComment] = useState(false)
  const isLongComment = (review.comment?.length || 0) > 300

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
      <div className="flex items-start gap-4">
        {/* User Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
          {review.user.image ? (
            <Image 
              src={review.user.image} 
              alt={review.user.name || 'User'}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            review.user.name?.charAt(0).toUpperCase() || '?'
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Review Header */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-semibold text-gray-900">
              {review.user.name || 'Anonymous'}
            </span>
            {review.verified && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                ✓ Verified Purchase
              </span>
            )}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= review.rating 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          
          {/* Review Content */}
          {review.title && (
            <h4 className="font-semibold text-gray-900 mb-2 text-lg">
              {review.title}
            </h4>
          )}
          
          {review.comment && (
            <div className="mb-4">
              <p className="text-gray-700 leading-relaxed">
                {showFullComment || !isLongComment
                  ? review.comment
                  : `${review.comment.slice(0, 300)}...`}
              </p>
              {isLongComment && (
                <button
                  onClick={() => setShowFullComment(!showFullComment)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                >
                  {showFullComment ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>
          )}

          {/* Review Images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {review.images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={img}
                    alt={`Review image ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Review Actions */}
          <div className="flex items-center gap-4 pt-3 border-t">
            <span className="text-sm text-gray-500">Was this helpful?</span>
            <button
              onClick={() => setHelpful(helpful === true ? null : true)}
              className={`flex items-center gap-1 text-sm transition ${
                helpful === true 
                  ? 'text-green-600 font-medium' 
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Yes {review.helpfulCount ? `(${review.helpfulCount})` : ''}
            </button>
            <button
              onClick={() => setHelpful(helpful === false ? null : false)}
              className={`flex items-center gap-1 text-sm transition ${
                helpful === false 
                  ? 'text-red-600 font-medium' 
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              No
            </button>
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition ml-auto">
              <Flag className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}