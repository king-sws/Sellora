/* eslint-disable react/no-unescaped-entities */
// components/store/ImageGallery.tsx
'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn, X, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

interface ImageGalleryProps {
  images: string[]
  productName: string
  enableZoom?: boolean
  autoPlayInterval?: number // Auto-advance slides (0 = disabled)
  showThumbnails?: boolean
  aspectRatio?: 'square' | 'video' | 'portrait'
}

export function ImageGallery({ 
  images, 
  productName, 
  enableZoom = true,
  autoPlayInterval = 0,
  showThumbnails = true,
  aspectRatio = 'square'
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const zoomModalRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // Aspect ratio classes
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]'
  }

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    setImageLoaded(false)
    setImageError(false)
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    setImageLoaded(false)
    setImageError(false)
  }, [images.length])

  const handleThumbnailClick = (index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index)
      setImageLoaded(false)
      setImageError(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZoomed) {
        if (e.key === 'Escape') {
          setIsZoomed(false)
        }
      } else {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          handlePrevious()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          handleNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZoomed, handlePrevious, handleNext])

  // Auto-play functionality
  useEffect(() => {
    if (autoPlayInterval > 0 && !isZoomed) {
      autoPlayRef.current = setInterval(() => {
        handleNext()
      }, autoPlayInterval)

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current)
        }
      }
    }
  }, [autoPlayInterval, isZoomed, handleNext])

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

  // Focus trap for zoom modal
  useEffect(() => {
    if (isZoomed && zoomModalRef.current) {
      const focusableElements = zoomModalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }

      document.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => document.removeEventListener('keydown', handleTabKey)
    }
  }, [isZoomed])

  // Validate images prop
  if (!images || images.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`${aspectClasses[aspectRatio]} bg-white rounded-2xl flex items-center justify-center border-2 border-gray-200 shadow-lg`}>
          <p className="text-gray-400 text-sm">No images available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div 
        className={`relative ${aspectClasses[aspectRatio]} bg-white rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg group`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label="Product image gallery"
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
          src={images[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1} of ${images.length}`}
          fill
          className={`object-contain p-6 transition-all duration-500 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } group-hover:scale-105`}
          priority={currentIndex === 0}
          onLoadingComplete={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true)
            setImageLoaded(false)
          }}
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20 border border-gray-200"
              aria-label="Previous image"
              tabIndex={0}
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20 border border-gray-200"
              aria-label="Next image"
              tabIndex={0}
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Zoom Button */}
        {enableZoom && (
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20 border border-gray-200"
            aria-label="Zoom image"
            tabIndex={0}
          >
            <ZoomIn className="w-5 h-5 text-gray-800" />
          </button>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div 
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/70 text-white text-sm font-semibold z-20"
            role="status"
            aria-live="polite"
          >
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Progress Dots */}
        {images.length > 1 && images.length <= 10 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20" role="tablist">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
                role="tab"
                aria-selected={index === currentIndex}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2" role="tablist">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`
                relative aspect-square rounded-lg overflow-hidden border-2 transition-all bg-white
                ${index === currentIndex 
                  ? 'border-blue-600 ring-2 ring-blue-200 scale-105' 
                  : 'border-gray-300 hover:border-blue-400 hover:scale-105'
                }
              `}
              aria-label={`View image ${index + 1}`}
              role="tab"
              aria-selected={index === currentIndex}
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

      {/* Zoom Modal */}
      {isZoomed && (
        <div 
          ref={zoomModalRef}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsZoomed(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            aria-label="Close zoom (press Escape)"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {/* Navigation in zoom mode */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}
          
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <Image
              src={images[currentIndex]}
              alt={`${productName} - Zoomed view`}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </div>
  )
}