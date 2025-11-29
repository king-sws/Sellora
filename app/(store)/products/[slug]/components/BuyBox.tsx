/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/products/[slug]/components/BuyBox.tsx
'use client'

import Link from 'next/link'
import { Truck, MapPin, Lock, CheckCircle, Package, CreditCard, Share2, Zap } from 'lucide-react'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { calculateDiscount, formatPrice } from '@/lib/utils'

interface BuyBoxProps {
  product: any
  discount: number
  selectedVariant: any
}

function PriceDisplay({ 
  price, 
  comparePrice, 
  discount,
}: { 
  price: number
  comparePrice?: number | null
  discount: number
}) {
  const [dollars, cents] = price.toFixed(2).split('.')
  
  return (
    <div className="space-y-1">
      {discount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
            -{discount}%
          </span>
          <span className="text-red-600 text-sm font-medium">Limited time deal</span>
        </div>
      )}
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm text-gray-700 font-medium">$</span>
        <span className="text-2xl font-normal text-gray-900">
          {dollars}
        </span>
        <span className="text-base text-gray-700 font-medium">
          {cents}
        </span>
      </div>
      {comparePrice && comparePrice > price && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">List Price:</span>
          <span className="text-gray-500 line-through">
            {formatPrice(comparePrice)}
          </span>
        </div>
      )}
      {discount > 0 && comparePrice && (
        <p className="text-sm text-green-700 font-medium">
          You save {formatPrice(comparePrice - price)} ({discount}%)
        </p>
      )}
    </div>
  )
}

export function BuyBox({ 
  product, 
  discount,
  selectedVariant
}: BuyBoxProps) {
  const displayPrice = selectedVariant?.price || product.price
  const displayComparePrice = selectedVariant?.comparePrice || product.comparePrice
  const displayStock = selectedVariant?.stock || product.stock
  const isOutOfStock = displayStock === 0
  const variantDiscount = calculateDiscount(displayPrice, displayComparePrice)
  
  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* Price */}
      <PriceDisplay 
        price={displayPrice}
        comparePrice={displayComparePrice}
        discount={variantDiscount}
      />

      {/* Delivery Info */}
      <div className="space-y-3 pt-3 border-t border-gray-200">
        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-900 font-semibold">FREE Delivery</p>
            <p className="text-xs text-gray-600">on orders over $50</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Deliver to <span className="font-semibold text-gray-900">US</span>
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Ships from <span className="font-medium">our warehouse</span>
          </p>
        </div>
      </div>

      {/* Stock Status */}
      <div className="pt-3 border-t border-gray-200">
        {displayStock > 0 ? (
          <div className="space-y-1.5">
            <p className="text-base text-green-700 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Available
            </p>
            {displayStock <= 10 && (
              <p className="text-sm text-orange-600">
                Low stock - order soon
              </p>
            )}
          </div>
        ) : (
          <p className="text-base text-red-600 font-medium">Currently unavailable</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <AddToCartButton 
          productId={product.id}
          variantId={selectedVariant?.id}
          disabled={isOutOfStock}
          stock={displayStock}
        />

        {isOutOfStock ? (
          <div className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gray-300 text-gray-500 cursor-not-allowed">
            <Zap className="w-5 h-5" />
            Buy Now
          </div>
        ) : (
          <Link
            href={`/checkout?product=${product.id}${selectedVariant ? `&variant=${selectedVariant.id}` : ''}&quantity=1`}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-sm hover:shadow-md"
          >
            <Zap className="w-5 h-5" />
            Buy Now
          </Link>
        )}
      </div>

      {/* Secure Transaction */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Lock className="w-4 h-4 text-green-600" />
          <span className="font-medium">Secure transaction</span>
        </div>

        <div className="space-y-2 text-xs text-gray-700">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <span>30-day return policy</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <span>Ships from our warehouse</span>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <span>Secure payment processing</span>
          </div>
        </div>
      </div>
    </div>
  )
}