/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/products/[slug]/components/ProductReviews.tsx
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Star,
  StarHalf,
  User,
  Calendar,
  Shield,
  MessageSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  isVerified: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  verifiedReviews: number
  ratingDistribution: Record<number, number>
}

interface ReviewsData {
  reviews: Review[]
  stats: ReviewStats
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface ProductReviewsProps {
  productId: string
  productName: string
}

export default function ProductReviews({
  productId,
  productName,
}: ProductReviewsProps) {
  const { data: session } = useSession()
  const [data, setData] = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    comment: "",
  })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [currentPage, sortBy, ratingFilter])

  useEffect(() => {
    if (session?.user) {
      checkUserReview()
    }
  }, [session?.user, productId])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        productId,
        page: currentPage.toString(),
        limit: "10",
        sortBy,
        ...(ratingFilter !== "all" && { rating: ratingFilter }),
      })

      const response = await fetch(`/api/reviews?${params}`)
      if (response.ok) {
        const reviewsData = await response.json()
        setData(reviewsData)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkUserReview = async () => {
    if (!session?.user) return

    try {
      const response = await fetch(`/api/reviews/user?productId=${productId}`)
      if (response.ok) {
        const review = await response.json()
        if (review) setUserReview(review)
      }
    } catch (error) {
      console.error("Error checking user review:", error)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user || reviewForm.rating === 0) return

    try {
      setSubmittingReview(true)
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: reviewForm.rating,
          title: reviewForm.title.trim() || null,
          comment: reviewForm.comment.trim() || null,
        }),
      })

      if (response.ok) {
        const newReview = await response.json()
        setUserReview(newReview)
        setShowReviewForm(false)
        setReviewForm({ rating: 0, title: "", comment: "" })
        fetchReviews()
      }
    } catch (error) {
      console.error("Error submitting review:", error)
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (
    rating: number,
    size: "sm" | "md" | "lg" = "sm",
    interactive = false,
    onRatingChange?: (rating: number) => void
  ) => {
    const stars = []
    const sizeClasses = { 
      sm: "w-4 h-4", 
      md: "w-5 h-5", 
      lg: "w-6 h-6" 
    }
    const sizeClass = sizeClasses[size]

    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating
      const isHalf = i - 0.5 <= rating && i > rating

      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => interactive && onRatingChange?.(i)}
          disabled={!interactive}
          className={`${sizeClass} ${
            interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""
          } ${
            isFilled
              ? "text-yellow-500 fill-yellow-500"
              : isHalf
              ? "text-yellow-500"
              : "text-muted-foreground/30"
          }`}
        >
          {isHalf ? (
            <StarHalf className={sizeClass} />
          ) : (
            <Star className={sizeClass} fill={isFilled ? "currentColor" : "none"} />
          )}
        </button>
      )
    }
    return <div className="flex items-center gap-0.5">{stars}</div>
  }

  const getRatingFilterOptions = () => [
    { value: "all", label: "All Reviews", count: data?.stats.totalReviews || 0 },
    { value: "5", label: "5 Stars", count: data?.stats.ratingDistribution[5] || 0 },
    { value: "4", label: "4 Stars", count: data?.stats.ratingDistribution[4] || 0 },
    { value: "3", label: "3 Stars", count: data?.stats.ratingDistribution[3] || 0 },
    { value: "2", label: "2 Stars", count: data?.stats.ratingDistribution[2] || 0 },
    { value: "1", label: "1 Star", count: data?.stats.ratingDistribution[1] || 0 },
  ]

  if (loading && !data) {
    return (
      <div className="mt-12 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Customer Reviews</h2>
        {session?.user && !userReview && (
          <Button onClick={() => setShowReviewForm(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Review Summary Card */}
      {data?.stats && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Overall Rating */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    {data.stats.averageRating.toFixed(1)}
                  </div>
                  {renderStars(Math.round(data.stats.averageRating), "md")}
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {data.stats.totalReviews} reviews
                  </p>
                </div>
                
                <Separator orientation="vertical" className="h-24" />
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-foreground">{data.stats.verifiedReviews}</p>
                    <p>Verified purchases</p>
                  </div>
                </div>
              </div>

              {/* Right: Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = data.stats.ratingDistribution[rating] || 0
                  const percentage =
                    data.stats.totalReviews > 0
                      ? (count / data.stats.totalReviews) * 100
                      : 0
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-14">{rating} star</span>
                      <Progress value={percentage} className="flex-1" />
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Review */}
      {userReview && (
        <Card className="mb-8 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Your Review</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              {renderStars(userReview.rating, "md")}
              <span className="text-sm text-muted-foreground">
                {formatDate(userReview.createdAt, "long")}
              </span>
              {userReview.isVerified && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Verified Purchase
                </Badge>
              )}
            </div>
            {userReview.title && (
              <h4 className="font-semibold mb-2">{userReview.title}</h4>
            )}
            {userReview.comment && (
              <p className="text-muted-foreground leading-relaxed">
                {userReview.comment}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Write Your Review</CardTitle>
            <CardDescription>
              Share your thoughts about {productName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div className="space-y-2">
                <Label>Rating *</Label>
                {renderStars(reviewForm.rating, "lg", true, (rating) =>
                  setReviewForm((prev) => ({ ...prev, rating }))
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Review Title</Label>
                <Input
                  id="title"
                  placeholder="Summarize your experience"
                  value={reviewForm.title}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Your Review</Label>
                <Textarea
                  id="comment"
                  placeholder="Tell others about your experience with this product"
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reviewForm.comment.length}/1000 characters
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={reviewForm.rating === 0 || submittingReview}
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sort */}
      {data?.reviews && data.reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={ratingFilter} onValueChange={(value) => {
              setRatingFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getRatingFilterOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={(value: any) => {
            setSortBy(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Reviews List */}
      {data?.reviews && data.reviews.length > 0 ? (
        <div className="space-y-6">
          {data.reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={review.user.image || undefined} alt={review.user.name || "User"} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {renderStars(review.rating, "sm")}
                      <span className="text-sm font-semibold">
                        {review.rating}/5
                      </span>
                      {review.isVerified && (
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    {review.title && (
                      <h4 className="font-semibold">{review.title}</h4>
                    )}

                    {review.comment && (
                      <p className="text-muted-foreground leading-relaxed">
                        {review.comment}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium">
                        {review.user.name || "Anonymous"}
                      </span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(review.createdAt, "medium")}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to share your thoughts about {productName}
            </p>
            {session?.user && (
              <Button onClick={() => setShowReviewForm(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Write the First Review
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {[...Array(data.pagination.pages)].map((_, index) => {
              const page = index + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(data.pagination.pages, prev + 1))
            }
            disabled={currentPage >= data.pagination.pages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}