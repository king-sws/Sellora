// components/store/shipping-calculator.tsx
'use client'

import { useState } from 'react'
import { MapPin, Loader2, Truck, Package } from 'lucide-react'

interface ShippingOption {
  id: string
  name: string
  price: number
  estimatedDays: string
  carrier: string
}

interface ShippingCalculatorProps {
  productId: string
}

export function ShippingCalculator({ productId }: ShippingCalculatorProps) {
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [error, setError] = useState('')

  const calculateShipping = async () => {
    if (!zipCode || zipCode.length < 5) {
      setError('Please enter a valid zip code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call your shipping API endpoint
      // Integrate with Shippo (shippo.com) or EasyPost (easypost.com)
      const response = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          zipCode, 
          productId 
        })
      })

      if (!response.ok) throw new Error('Failed to calculate shipping')

      const data = await response.json()
      setOptions(data.options)
    } catch (err) {
      setError('Unable to calculate shipping. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">
          Check Delivery Options
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          maxLength={10}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={calculateShipping}
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Check'
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {options.length > 0 && (
        <div className="space-y-2 pt-2">
          {options.map((option) => (
            <div 
              key={option.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {option.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {option.estimatedDays} • {option.carrier}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {option.price === 0 ? 'FREE' : `$${option.price.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}