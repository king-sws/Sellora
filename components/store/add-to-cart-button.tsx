'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/use-cart'
import { Minus, Plus, ShoppingCart, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface AddToCartButtonProps {
  productId: string
  disabled?: boolean
  variantId?: string 
  stock: number
}

export function AddToCartButton({ productId, disabled, stock }: AddToCartButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { addToCart, cart } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  // Check if product is already in cart
  const existingItem = cart.items.find(item => item.product.id === productId)
  const currentCartQuantity = existingItem?.quantity || 0
  const maxQuantity = stock - currentCartQuantity

  const handleAddToCart = async () => {
    if (!session) {
      router.push(`/auth/sign-in?redirect=/product/${productId}`)
      return
    }

    setLoading(true)
    const result = await addToCart(productId, quantity)

    if (result.success) {
      setJustAdded(true)
      toast.success('Item added to cart', { description: `Added ${quantity} item(s)` })
      setQuantity(1) // Reset quantity
      setTimeout(() => setJustAdded(false), 2000)
    } else {
      toast.error(result.error || 'Something went wrong')
    }

    setLoading(false)
  }

  const increaseQuantity = () => {
    if (quantity < maxQuantity) setQuantity(q => q + 1)
  }

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(q => q - 1)
  }

  if (maxQuantity <= 0 && existingItem) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            ✓ Already in cart ({currentCartQuantity})
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Maximum quantity reached for this product
          </p>
        </div>
        <Link
          href="/cart"
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition"
        >
          <ShoppingCart className="w-5 h-5" />
          View Cart
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current cart status */}
      {existingItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            ✓ Already in cart: {currentCartQuantity} item{currentCartQuantity !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Quantity Selector */}
      {/* Quantity Selector */}
<div className="space-y-1">
  <div className="flex items-center gap-4">
    <span className="font-medium">Quantity:</span>
    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={decreaseQuantity}
        disabled={quantity <= 1}
        className="p-2 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="px-4 py-2 min-w-[50px] text-center border-x border-gray-300">
        {quantity}
      </span>
      <button
        type="button"
        onClick={increaseQuantity}
        disabled={quantity >= maxQuantity}
        className="p-2 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>

  {/* Low Stock Message (moved below for better alignment) */}
  {maxQuantity <= 5 && (
    <p className="text-sm text-orange-600 ml-[84px]">
      Only {maxQuantity} left
    </p>
  )}
</div>


      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={disabled || loading || stock === 0 || maxQuantity === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Adding...
          </>
        ) : justAdded ? (
          <>
            <Check className="w-5 h-5" />
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            {disabled ? 'Out of Stock' : 'Add to Cart'}
          </>
        )}
      </button>

      {/* Sign in prompt */}
      {!session && (
        <p className="text-sm text-gray-600 text-center">
          Please{" "}
          <button
            onClick={() => router.push(`/auth/sign-in?redirect=/product/${productId}`)}
            className="text-blue-600 hover:underline"
          >
            sign in
          </button>{" "}
          to add items to cart
        </p>
      )}

      {/* View cart link */}
      {existingItem && (
        <Link
          href="/cart"
          className="block text-center text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          View Cart ({cart.totalItems} items)
        </Link>
      )}
    </div>
  )
}
