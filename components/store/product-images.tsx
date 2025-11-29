// components/store/product-images.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductImagesProps {
  images: string[]
  productName: string
}

export function ProductImages({ images, productName }: ProductImagesProps) {
  // Check if product is a TV - compute once at component initialization
  const isTVProduct = (() => {
    const name = productName.toLowerCase()
    const tvKeywords = ['tv', 'television', 's25', 'smart tv', 'IdeaPad']
    return tvKeywords.some(keyword => name.includes(keyword))
  })()

  const [currentImage, setCurrentImage] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(
    isTVProduct ? 'contain' : 'cover'
  )
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handlePrevious = useCallback(() => {
    const newIndex = currentImage === 0 ? images.length - 1 : currentImage - 1
    setCurrentImage(newIndex)
    setImageLoaded(false)
    setImageError(false)
    // Reset to correct initial style for the new image
    setImageStyle((isTVProduct && newIndex === 0) ? 'contain' : 'cover')
  }, [images.length, currentImage, isTVProduct])

  const handleNext = useCallback(() => {
    const newIndex = (currentImage + 1) % images.length
    setCurrentImage(newIndex)
    setImageLoaded(false)
    setImageError(false)
    // Reset to correct initial style for the new image
    setImageStyle((isTVProduct && newIndex === 0) ? 'contain' : 'cover')
  }, [images.length, currentImage, isTVProduct])

  // Detect if image has transparency/no background
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // If it's a TV product AND it's the first image (index 0), keep it as 'contain' - don't analyze
    if (isTVProduct && currentImage === 0) {
      setImageLoaded(true)
      return
    }

    const img = e.currentTarget
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      setImageLoaded(true)
      return
    }

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    try {
      ctx.drawImage(img, 0, 0)
      
      // Check corners and edges for transparency or pure white
      const checkPoints = [
        { x: 0, y: 0 }, // top-left
        { x: canvas.width - 1, y: 0 }, // top-right
        { x: 0, y: canvas.height - 1 }, // bottom-left
        { x: canvas.width - 1, y: canvas.height - 1 }, // bottom-right
        { x: Math.floor(canvas.width / 2), y: 0 }, // top-center
        { x: 0, y: Math.floor(canvas.height / 2) }, // left-center
      ]

      let hasTransparency = false
      let pureWhiteCorners = 0

      for (const point of checkPoints) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data
        
        // Check for transparency
        if (pixel[3] < 255) {
          hasTransparency = true
          break
        }
        
        // Check for pure white or near-white (common in product photos without background)
        if (pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250) {
          pureWhiteCorners++
        }
      }

      // If image has transparency or mostly white corners, use contain
      if (hasTransparency || pureWhiteCorners >= 4) {
        setImageStyle('contain')
      } else {
        setImageStyle('cover')
      }
    } catch (err) {
      // If CORS error, default to cover (safer for images with backgrounds)
      console.log('Could not analyze image, using cover')
      setImageStyle('cover')
    }
    
    setImageLoaded(true)
  }, [isTVProduct, currentImage])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrevious])

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      handleNext()
    } else if (isRightSwipe) {
      handlePrevious()
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  if (!images.length) {
    return (
      <div className="aspect-square bg-white rounded-2xl flex items-center justify-center border-2 border-gray-200 shadow-lg">
        <span className="text-gray-400">No Image Available</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div 
        className="relative aspect-square bg-white rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center p-4">
              <p className="text-gray-400 text-sm mb-2">Failed to load image</p>
              <button
                onClick={() => {
                  setImageError(false)
                  setImageLoaded(false)
                }}
                className="text-blue-600 text-sm hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <Image
          src={images[currentImage]}
          alt={`${productName} ${currentImage + 1}`}
          fill
          className={cn(
            'transition-all duration-500',
            imageStyle === 'contain' ? 'object-contain p-6' : 'object-cover',
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
            'group-hover:scale-105'
          )}
          priority
          onLoad={handleImageLoad}
          onError={() => {
            setImageError(true)
            setImageLoaded(false)
          }}
          crossOrigin="anonymous"
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20 border border-gray-200"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4 text-gray-800" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20 border border-gray-200"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4 text-gray-800" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-md z-20">
    {currentImage + 1}/{images.length}
  </div>
)}


        {/* Progress Dots */}
        {images.length > 1 && images.length <= 10 && (
  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
    {images.map((_, index) => {
      const isActive = index === currentImage

      return (
        <button
          key={index}
          onClick={() => {
            setCurrentImage(index)
            setImageLoaded(false)
            setImageError(false)
            // Reset to correct initial style for the new image
            setImageStyle((isTVProduct && index === 0) ? 'contain' : 'cover')
          }}
          aria-label={`Go to image ${index + 1}`}
          className={cn(
            "transition-all rounded-full",
            isActive
              ? "w-4 h-2 bg-white"                   // active: small pill
              : "w-2 h-2 bg-white/50 hover:bg-white/80"
          )}
        />
      )
    })}
  </div>
)}

      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentImage(index)
                setImageLoaded(false)
                setImageError(false)
                // Reset to correct initial style for the new image
                setImageStyle((isTVProduct && index === 0) ? 'contain' : 'cover')
              }}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden border-2 transition-all bg-white',
                index === currentImage
                  ? 'border-blue-600 ring-2 ring-blue-200 scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:scale-105'
              )}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-contain p-2"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}