import { useState, useEffect } from 'react'

interface ProductImageStyleOptions {
  productName: string
  customKeywords?: string[]
  defaultStyle?: 'cover' | 'contain'
}

interface ProductImageStyleReturn {
  imageStyle: 'cover' | 'contain'
  isTVProduct: boolean
  isSpecialProduct: boolean
}

/**
 * Custom hook to determine the appropriate image style based on product type
 * @param options - Configuration options
 * @returns Object containing imageStyle, isTVProduct, and isSpecialProduct flags
 */
export const useProductImageStyle = ({
  productName,
  customKeywords = [],
  defaultStyle = 'cover'
}: ProductImageStyleOptions): ProductImageStyleReturn => {
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(defaultStyle)

  // Default keywords for products that need 'contain' style
  const defaultTVKeywords = ['tv', 'television', 's25', 'smart tv', 'oled', 'qled']
  
  // Combine default and custom keywords
  const allKeywords = [...defaultTVKeywords, ...customKeywords]

  const checkProductType = (name: string): boolean => {
    const lowerName = name.toLowerCase()
    return allKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()))
  }

  const isTVProduct = checkProductType(productName)

  useEffect(() => {
    setImageStyle(isTVProduct ? 'contain' : defaultStyle)
  }, [productName, isTVProduct, defaultStyle])

  return {
    imageStyle,
    isTVProduct,
    isSpecialProduct: isTVProduct
  }
}

export default useProductImageStyle