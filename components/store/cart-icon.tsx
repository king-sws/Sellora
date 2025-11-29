// components/store/cart-icon.tsx (Mini cart component for other pages)
'use client'

import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export function CartIcon() {
  const { cart, loading } = useCart()

  return (
    <Link href="/cart" className="relative group">
      <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="relative">
          <ShoppingCart className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
          {cart.totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
              {cart.totalItems > 99 ? '99+' : cart.totalItems}
            </span>
          )}
        </div>
        
        {!loading && cart.totalItems > 0 && (
          <div className="hidden lg:block text-sm">
            <div className="text-gray-600">Cart</div>
            <div className="font-semibold text-gray-900">
              {formatPrice(cart.total)}
            </div>
          </div>
        )}
      </div>

      {/* Mini cart preview (optional) */}
      {cart.totalItems > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Cart ({cart.totalItems} items)
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                    {item.product.images[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} × {formatPrice(item.product.price)}
                    </p>
                  </div>
                </div>
              ))}
              {cart.items.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  +{cart.items.length - 3} more items
                </p>
              )}
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total:</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="mt-3 space-y-2">
                <Link
                  href="/cart"
                  className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  View Cart
                </Link>
                <Link
                  href="/checkout"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Link>
  )
}