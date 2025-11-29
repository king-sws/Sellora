/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { Check, Package, AlertCircle, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Fixed Variant interface matching Prisma schema
interface Variant {
  id: string
  name: string
  sku: string
  price: number // Changed from number to match Prisma (can be null in DB but we handle it)
  comparePrice: number | null // Explicitly nullable
  stock: number
  attributes: Record<string, string> | any // JsonValue from Prisma
  images: string[]
  isActive: boolean
  _count?: {
    orderItems: number
  }
}

interface VariantSelectorProps {
  variants: any[] // Accept Prisma variant type
  selectedVariant?: any // Accept Prisma variant type
  productSlug: string
  productImages?: string[]
}

export default function VariantSelector({ 
  variants: rawVariants, 
  selectedVariant: rawSelectedVariant,
  productSlug,
  productImages = []
}: VariantSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Transform Prisma variants to our interface, handling nulls
  const variants: Variant[] = useMemo(() => 
    rawVariants
      .filter(v => v.price !== null) // Filter out variants with null prices
      .map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price ?? 0, // Fallback to 0 if null (shouldn't happen after filter)
        comparePrice: v.comparePrice,
        stock: v.stock,
        attributes: typeof v.attributes === 'object' && v.attributes !== null 
          ? v.attributes as Record<string, string>
          : {},
        images: Array.isArray(v.images) ? v.images : [],
        isActive: v.isActive,
        _count: v._count
      })),
    [rawVariants]
  )

  // Transform selected variant
  const selectedVariant: Variant | undefined = useMemo(() => {
    if (!rawSelectedVariant || rawSelectedVariant.price === null) return undefined
    return {
      id: rawSelectedVariant.id,
      name: rawSelectedVariant.name,
      sku: rawSelectedVariant.sku,
      price: rawSelectedVariant.price,
      comparePrice: rawSelectedVariant.comparePrice,
      stock: rawSelectedVariant.stock,
      attributes: typeof rawSelectedVariant.attributes === 'object' && rawSelectedVariant.attributes !== null
        ? rawSelectedVariant.attributes as Record<string, string>
        : {},
      images: Array.isArray(rawSelectedVariant.images) ? rawSelectedVariant.images : [],
      isActive: rawSelectedVariant.isActive,
      _count: rawSelectedVariant._count
    }
  }, [rawSelectedVariant])

  const [selectedId, setSelectedId] = useState(selectedVariant?.id || variants[0]?.id)

  // Get current selected variant
  const currentVariant = useMemo(() => 
    variants.find(v => v.id === selectedId) || selectedVariant || variants[0],
    [selectedId, variants, selectedVariant]
  )

  // Extract unique attribute types
  const attributeTypes = useMemo(() => {
    const types: string[] = []
    variants.forEach(variant => {
      if (variant.attributes && typeof variant.attributes === 'object') {
        Object.keys(variant.attributes).forEach(key => {
          if (!types.includes(key)) types.push(key)
        })
      }
    })
    return types
  }, [variants])

  // Get display image
  const displayImage = useMemo(() => {
    if (currentVariant?.images?.[0]) return currentVariant.images[0]
    if (productImages?.[0]) return productImages[0]
    return null
  }, [currentVariant, productImages])

  const handleVariantChange = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId)
    if (!variant || variant.stock === 0) return
    
    setSelectedId(variantId)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('variant', variantId)
    router.push(`/products/${productSlug}?${params.toString()}`, { scroll: false })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const calculateDiscount = (price: number, comparePrice: number) => {
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  // Get available values for each attribute type
  const getAvailableValues = (attrType: string) => {
    return [...new Set(
      variants
        .filter(v => v.attributes?.[attrType] && v.isActive)
        .map(v => v.attributes[attrType])
    )]
  }

  // Check if a specific attribute value is available
  const isAttributeAvailable = (attrType: string, value: string) => {
    return variants.some(v => 
      v.attributes?.[attrType] === value && 
      v.isActive && 
      v.stock > 0
    )
  }

  // Get variant by attribute value
  const getVariantByAttribute = (attrType: string, value: string) => {
    return variants.find(v => v.attributes?.[attrType] === value && v.isActive)
  }

  // Hide component if no variants or only one variant with no meaningful attributes
  if (!variants.length || variants.length === 0) {
    return null
  }

  // Hide if only one active variant
  const activeVariants = variants.filter(v => v.isActive)
  if (activeVariants.length <= 1 && attributeTypes.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Variant Selection */}
        <div className="space-y-4 sm:space-y-5">
          {attributeTypes.map((attrType) => {
            const availableValues = getAvailableValues(attrType)
            const currentValue = currentVariant?.attributes?.[attrType]

            return (
              <div key={attrType} className="space-y-2 sm:space-y-3">
                
                {/* Attribute label - Enhanced responsive */}
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 capitalize flex items-center gap-2">
                    {attrType}:
                    <span className="text-gray-900 font-bold">
                      {currentValue || 'Select'}
                    </span>
                  </label>

                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Select your preferred {attrType.toLowerCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Values grid - Enhanced with better responsive breakpoints */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                  {availableValues.map((value) => {
                    const variant = getVariantByAttribute(attrType, value)
                    if (!variant) return null

                    const isSelected = currentVariant?.id === variant.id
                    const isOut = variant.stock === 0
                    const isLow = variant.stock > 0 && variant.stock <= 5
                    const isEnabled = isAttributeAvailable(attrType, value)

                    return (
                      <Tooltip key={variant.id}>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => handleVariantChange(variant.id)}
                            disabled={!isEnabled || isOut}
                            variant={isSelected ? "outline" : "outline"}
                            className={`
                              relative h-auto py-2 sm:py-3 px-2 flex flex-col items-center gap-1
                              transition-all duration-200 min-h-[80px] sm:min-h-[100px]
                              ${isSelected ? "ring-2 ring-blue-500 ring-offset-2 bg-white" : ""}
                              ${(!isEnabled || isOut) 
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:scale-105 hover:shadow-md active:scale-95"
                              }
                            `}
                          >

                            {/* Thumbnail - Enhanced responsive */}
                            {variant.images?.[0] && (
                              <div className="w-full aspect-square rounded overflow-hidden mb-1">
                                <img
                                  src={variant.images[0]}
                                  alt={value}
                                  className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </div>
                            )}

                            {/* Value - Enhanced responsive text */}
                            <span className="font-semibold text-xs sm:text-sm text-center leading-tight line-clamp-2">
                              {value}
                            </span>

                            {/* Selected checkmark */}
                            {isSelected && (
                              <Check className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 text-blue-600 bg-white rounded-full p-0.5 shadow-md" />
                            )}

                            {/* Price - Enhanced responsive */}
                            {!isOut && variant.price && (
                              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                                {formatPrice(variant.price)}
                              </span>
                            )}

                            {/* Low stock badge */}
                            {isLow && !isOut && (
                              <Badge variant="outline" className="text-xs py-0 h-4 sm:h-5 border-orange-300 text-orange-700">
                                {variant.stock} left
                              </Badge>
                            )}

                          </Button>
                        </TooltipTrigger>

                        {/* Tooltip content */}
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-xs sm:text-sm">{variant.name}</p>

                            {Object.entries(variant.attributes || {}).map(([key, val]) => (
                              <p key={key} className="text-xs">{key}: {String(val)}</p>
                            ))}

                            <p className="text-xs">
                              {isOut ? (
                                <span className="text-red-500 font-semibold">Out of Stock</span>
                              ) : (
                                <span className="text-green-500">{variant.stock} available</span>
                              )}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Selected Variant Summary - Enhanced responsive */}
        {currentVariant && (
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-bold text-xs sm:text-sm md:text-base text-blue-900 flex items-center gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              Selected Configuration
            </h4>
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-blue-700">Variant:</span>
                <span className="font-semibold text-blue-900 text-right">{currentVariant.name}</span>
              </div>
              
              {Object.entries(currentVariant.attributes || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center gap-2">
                  <span className="text-blue-700 capitalize">{key}:</span>
                  <Badge variant="secondary" className="font-medium text-xs">{String(value)}</Badge>
                </div>
              ))}
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center gap-2">
                <span className="text-blue-700">Stock Status:</span>
                {currentVariant.stock > 0 ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    {currentVariant.stock} in stock
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Out of stock
                  </Badge>
                )}
              </div>

              {/* Show price with discount if applicable */}
              {currentVariant.comparePrice && currentVariant.comparePrice > currentVariant.price && (
                <div className="flex justify-between items-start gap-2 pt-2">
                  <span className="text-blue-700 flex-shrink-0">Price:</span>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 line-through">
                        {formatPrice(currentVariant.comparePrice)}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-green-600">
                        {formatPrice(currentVariant.price)}
                      </span>
                    </div>
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Save {calculateDiscount(currentVariant.price, currentVariant.comparePrice)}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Variant Comparison Table - Enhanced responsive with horizontal scroll */}
        {variants.length > 1 && (
          <details className="group">
            <summary className="cursor-pointer text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 py-2 min-h-[44px] md:min-h-0">
              <span>Compare all {variants.length} options</span>
              <svg 
                className="w-4 h-4 transition-transform group-open:rotate-180" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-900">Option</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-900">Price</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-900">Stock</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-900">Attributes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {variants.filter(v => v.isActive).map((variant) => (
                      <tr 
                        key={variant.id}
                        className={`
                          hover:bg-gray-50 transition-colors cursor-pointer
                          ${currentVariant?.id === variant.id ? 'bg-blue-50' : ''}
                        `}
                        onClick={() => variant.stock > 0 && handleVariantChange(variant.id)}
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center gap-2">
                            {variant.images?.[0] && (
                              <img 
                                src={variant.images[0]} 
                                alt={variant.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
                                loading="lazy"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{variant.name}</p>
                              <code className="text-xs text-gray-500 block truncate">{variant.sku}</code>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-gray-900">
                              {formatPrice(variant.price)}
                            </span>
                            {variant.comparePrice && variant.comparePrice > variant.price && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 line-through">
                                  {formatPrice(variant.comparePrice)}
                                </span>
                                <Badge variant="default" className="bg-green-600 text-xs h-5">
                                  -{calculateDiscount(variant.price, variant.comparePrice)}%
                                </Badge>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          <Badge 
                            variant={variant.stock > 10 ? 'default' : variant.stock > 0 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {variant.stock > 0 ? `${variant.stock} available` : 'Out of stock'}
                          </Badge>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(variant.attributes || {}).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {String(value)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        )}

        {/* Out of Stock Alert */}
        {currentVariant?.stock === 0 && (
          <Alert variant="destructive" className="text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This variant is currently out of stock. Please select another option or check back later.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  )
}