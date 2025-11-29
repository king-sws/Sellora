// components/store/checkout-summary.tsx
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import { Tag, X, Loader2, Check, Lock, RotateCcw, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface AppliedCoupon {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  description?: string
  discount: number
}

interface CheckoutSummaryProps {
  cart: {
    items: Array<{
      id: string
      quantity: number
      product: {
        name: string
        price: number
        images: string[]
        hasBackground?: boolean // Optional flag to detect if image has background
      }
    }>
    subtotal: number
    tax: number
    shipping: number
    total: number
    totalItems: number
  }
  submitting: boolean
  appliedCoupon?: AppliedCoupon | null
  totals?: {
    subtotal: number
    tax: number
    shipping: number
    discount: number
    total: number
  }
  onCouponApplied?: (coupon: AppliedCoupon) => void
  onCouponRemoved?: () => void
}

export function CheckoutSummary({ 
  cart, 
  submitting, 
  appliedCoupon,
  totals,
  onCouponApplied,
  onCouponRemoved
}: CheckoutSummaryProps) {
  const [couponCode, setCouponCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [showCouponInput, setShowCouponInput] = useState(false)

  // Use totals if provided, otherwise use cart values
  const displayTotals = totals || {
    subtotal: cart.subtotal,
    tax: cart.tax,
    shipping: cart.shipping,
    discount: 0,
    total: cart.total
  }

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }

    setValidating(true)
    setCouponError(null)

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderAmount: cart.subtotal
        })
      })

      const data = await response.json()

      if (data.valid && data.coupon) {
        onCouponApplied?.({
          id: data.coupon.id,
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value,
          description: data.coupon.description,
          discount: data.discount
        })
        setCouponCode('')
        setShowCouponInput(false)
        setCouponError(null)
      } else {
        setCouponError(data.message || 'Invalid coupon code')
      }
    } catch (error) {
      console.error('Error validating coupon:', error)
      setCouponError('Failed to validate coupon. Please try again.')
    } finally {
      setValidating(false)
    }
  }, [couponCode, cart.subtotal, onCouponApplied])

  const handleRemoveCoupon = useCallback(() => {
    onCouponRemoved?.()
    setCouponCode('')
    setCouponError(null)
  }, [onCouponRemoved])

  const getImageStyle = useCallback((item: typeof cart.items[0]) => {
    // If product has background or is first item, use cover
    // Otherwise use contain with padding for transparent products
    return item.product.hasBackground ? 'cover' : 'contain'
  }, [])

  return (
    <Card className="sticky top-4 shadow-md">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

        {/* Cart Items */}
        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {cart.items.map((item) => {
            const imageStyle = getImageStyle(item)
            const usePadding = imageStyle === 'contain'
            
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`relative w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0 ${usePadding ? 'p-2' : ''}`}>
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className={`${imageStyle === 'contain' ? 'object-contain' : 'object-cover'}`}
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × {formatPrice(item.product.price)}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatPrice(item.product.price * item.quantity)}
                </div>
              </div>
            )
          })}
        </div>

        <Separator className="my-4" />

        {/* Coupon Section */}
        <div className="mb-4">
          {appliedCoupon ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      Coupon Applied: <Badge variant="outline" className="ml-1">{appliedCoupon.code}</Badge>
                    </p>
                    {appliedCoupon.description && (
                      <p className="text-xs text-green-700 mt-1">
                        {appliedCoupon.description}
                      </p>
                    )}
                    <p className="text-xs text-green-700 mt-1">
                      {appliedCoupon.type === 'PERCENTAGE' 
                        ? `${appliedCoupon.value}% off` 
                        : `${formatPrice(appliedCoupon.value)} off`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveCoupon}
                  className="h-6 w-6 text-green-600 hover:text-green-800 hover:bg-green-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {showCouponInput ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleApplyCoupon()
                        }
                      }}
                      placeholder="Enter coupon code"
                      className="flex-1 uppercase"
                      disabled={validating}
                    />
                    <Button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validating || !couponCode.trim()}
                      size="default"
                    >
                      {validating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-destructive">{couponError}</p>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setShowCouponInput(false)
                      setCouponCode('')
                      setCouponError(null)
                    }}
                    className="h-auto p-0 text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowCouponInput(true)}
                  className="h-auto p-0 text-sm font-medium"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Have a coupon code?
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Order Totals */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({cart.totalItems} items)</span>
            <span className="font-medium">{formatPrice(displayTotals.subtotal)}</span>
          </div>
          
          {displayTotals.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span className="font-medium">-{formatPrice(displayTotals.discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatPrice(displayTotals.tax)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {displayTotals.shipping === 0 ? (
                <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-50">FREE</Badge>
              ) : (
                formatPrice(displayTotals.shipping)
              )}
            </span>
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(displayTotals.total)}</span>
          </div>
          
          {displayTotals.discount > 0 && (
            <p className="text-xs text-green-600 text-right">
              You saved {formatPrice(displayTotals.discount)}!
            </p>
          )}
        </div>

        {/* Place Order Button */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full mt-6 h-12 text-base font-semibold"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Place Order'
          )}
        </Button>

        {/* Trust Badges */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Secure Checkout</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            <span>30-Day Returns</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Truck className="w-4 h-4" />
            <span>Free Shipping Over $50</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}