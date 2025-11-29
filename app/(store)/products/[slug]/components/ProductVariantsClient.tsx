// app/(store)/products/[slug]/components/ProductVariantsClient.tsx
'use client'

import { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { BuyBox } from './BuyBox'

interface ProductVariant {
  id: string
  name: string
  price: number | null
  comparePrice: number | null
  stock: number
  attributes: Record<string, string>
  images: string[]
}

interface ProductVariantsClientProps {
  variants: ProductVariant[]
  showBuyBox?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product?: any
  discount?: number
}

export default function ProductVariantsClient({
  variants,
  showBuyBox = false,
  product,
  discount = 0
}: ProductVariantsClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  )

  const selectedVariant = variants.find(v => v.id === selectedVariantId)

  // Group attributes
  const attributeNames = useMemo(() => {
    if (variants.length === 0) return []
    return Object.keys(variants[0].attributes).sort()
  }, [variants])

  // Get unique values for each attribute
  const attributeOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {}
    
    attributeNames.forEach(attrName => {
      options[attrName] = new Set()
      variants.forEach(variant => {
        if (variant.attributes[attrName]) {
          options[attrName].add(variant.attributes[attrName])
        }
      })
    })
    
    return Object.entries(options).reduce((acc, [key, set]) => {
      acc[key] = Array.from(set).sort()
      return acc
    }, {} as Record<string, string[]>)
  }, [variants, attributeNames])

  // Get currently selected attribute values
  const selectedAttributes = selectedVariant?.attributes || {}

  // Filter available variants based on selected attributes
  const getAvailableVariantsForAttribute = (
    attrName: string,
    attrValue: string
  ) => {
    return variants.filter(v => {
      const hasMatchingAttribute = v.attributes[attrName] === attrValue
      
      // Check if other selected attributes match
      for (const [key, value] of Object.entries(selectedAttributes)) {
        if (key !== attrName && key in v.attributes) {
          if (v.attributes[key] !== value) {
            return false
          }
        }
      }
      
      return hasMatchingAttribute
    })
  }

  if (variants.length === 0) return null

  // Single attribute view
  if (attributeNames.length === 1 && !showBuyBox) {
    const attrName = attributeNames[0]
    const options = attributeOptions[attrName] || []

    return (
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">
          Choose {attrName}
        </label>
        <div className="flex flex-wrap gap-2">
          {options.map((value) => {
            const matchingVariants = variants.filter(
              v => v.attributes[attrName] === value
            )
            const isAvailable = matchingVariants.some(v => v.stock > 0)
            const isSelected = selectedAttributes[attrName] === value

            return (
              <button
                key={value}
                onClick={() => {
                  const variant = matchingVariants[0]
                  if (variant) setSelectedVariantId(variant.id)
                }}
                disabled={!isAvailable}
                className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2">
                  {isSelected && <Check className="w-4 h-4" />}
                  {value}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Multiple attributes or buy box view
  return (
    <>
      {/* Attribute Selectors */}
      <div className="space-y-4">
        {attributeNames.map((attrName) => {
          const options = attributeOptions[attrName] || []
          const currentValue = selectedAttributes[attrName]

          return (
            <div key={attrName}>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Choose {attrName}
              </label>
              <div className="flex flex-wrap gap-2">
                {options.map((value) => {
                  const availableVariants = getAvailableVariantsForAttribute(
                    attrName,
                    value
                  )
                  const isAvailable = availableVariants.some(v => v.stock > 0)
                  const isSelected = currentValue === value

                  return (
                    <button
                      key={value}
                      onClick={() => {
                        const variant = availableVariants[0]
                        if (variant) setSelectedVariantId(variant.id)
                      }}
                      disabled={!isAvailable}
                      className={`px-3 py-2 rounded-md border transition-all text-sm font-medium ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="w-4 h-4" />}
                        {value}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Buy Box */}
      {showBuyBox && product && selectedVariant && (
        <div className="mt-4">
          <BuyBox
            product={product}
            discount={discount}
            selectedVariant={selectedVariant}
          />
        </div>
      )}
    </>
  )
}