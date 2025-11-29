// lib/image-utils.ts
// Reusable utility to detect if an image has a background or not

export type ImageStyleType = 'cover' | 'contain'

export interface ImageAnalysisResult {
  hasTransparency: boolean
  hasLightBackground: boolean
  recommendedStyle: ImageStyleType
  backgroundColor?: string
}

/**
 * Analyzes an image to determine if it has a background
 * @param img - HTMLImageElement to analyze
 * @param options - Configuration options
 * @returns Analysis result with recommended display style
 */
export async function analyzeImageBackground(
  img: HTMLImageElement,
  options: {
    lightThreshold?: number // RGB threshold for "light" pixels (default: 240)
    minLightPixels?: number // Minimum light pixels to consider as "no background" (default: 5)
    checkEdgePoints?: boolean // Check edge points only (faster) vs entire border (default: true)
  } = {}
): Promise<ImageAnalysisResult> {
  const {
    lightThreshold = 240,
    minLightPixels = 5,
    checkEdgePoints = true
  } = options

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) {
      resolve({
        hasTransparency: false,
        hasLightBackground: false,
        recommendedStyle: 'cover'
      })
      return
    }

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    try {
      ctx.drawImage(img, 0, 0)
      
      let checkPoints: { x: number; y: number }[] = []

      if (checkEdgePoints) {
        // Fast method: Check corners and edge midpoints
        checkPoints = [
          { x: 0, y: 0 }, // top-left
          { x: canvas.width - 1, y: 0 }, // top-right
          { x: 0, y: canvas.height - 1 }, // bottom-left
          { x: canvas.width - 1, y: canvas.height - 1 }, // bottom-right
          { x: Math.floor(canvas.width / 2), y: 0 }, // top-center
          { x: 0, y: Math.floor(canvas.height / 2) }, // left-center
          { x: canvas.width - 1, y: Math.floor(canvas.height / 2) }, // right-center
          { x: Math.floor(canvas.width / 2), y: canvas.height - 1 }, // bottom-center
        ]
      } else {
        // Thorough method: Check entire border (slower but more accurate)
        const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 20))
        
        // Top edge
        for (let x = 0; x < canvas.width; x += step) {
          checkPoints.push({ x, y: 0 })
        }
        // Bottom edge
        for (let x = 0; x < canvas.width; x += step) {
          checkPoints.push({ x, y: canvas.height - 1 })
        }
        // Left edge
        for (let y = 0; y < canvas.height; y += step) {
          checkPoints.push({ x: 0, y })
        }
        // Right edge
        for (let y = 0; y < canvas.height; y += step) {
          checkPoints.push({ x: canvas.width - 1, y })
        }
      }

      let hasTransparency = false
      let lightPixels = 0
      const totalPixels = checkPoints.length

      for (const point of checkPoints) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data
        
        // Check for transparency
        if (pixel[3] < 255) {
          hasTransparency = true
          break
        }
        
        // Check for light backgrounds (white/light gray)
        if (pixel[0] > lightThreshold && 
            pixel[1] > lightThreshold && 
            pixel[2] > lightThreshold) {
          lightPixels++
        }
      }

      const hasLightBackground = lightPixels >= minLightPixels
      const recommendedStyle: ImageStyleType = 
        (hasTransparency || hasLightBackground) ? 'contain' : 'cover'

      resolve({
        hasTransparency,
        hasLightBackground,
        recommendedStyle,
        backgroundColor: hasLightBackground ? 'white' : undefined
      })
    } catch (err) {
      console.warn('Could not analyze image:', err)
      // Fallback to contain (safer default)
      resolve({
        hasTransparency: false,
        hasLightBackground: false,
        recommendedStyle: 'contain'
      })
    }
  })
}

/**
 * React hook for analyzing image backgrounds
 */
export function useImageAnalysis() {
  const analyzeImage = async (
    imgElement: HTMLImageElement,
    options?: Parameters<typeof analyzeImageBackground>[1]
  ): Promise<ImageAnalysisResult> => {
    return analyzeImageBackground(imgElement, options)
  }

  return { analyzeImage }
}

/**
 * Get optimal CSS class for image based on analysis
 */
export function getImageClassName(
  style: ImageStyleType,
  additionalClasses: string = ''
): string {
  const baseClass = style === 'contain' 
    ? 'object-contain p-4 bg-white' 
    : 'object-cover'
  
  return `${baseClass} ${additionalClasses}`.trim()
}

/**
 * Synchronous quick check (less accurate but instant)
 * Checks if filename suggests transparency
 */
export function quickCheckTransparency(imageUrl: string): ImageStyleType {
  const url = imageUrl.toLowerCase()
  
  // PNG files often have transparency
  if (url.endsWith('.png') || url.includes('.png?')) {
    return 'contain'
  }
  
  // WebP can have transparency
  if (url.endsWith('.webp') || url.includes('.webp?')) {
    return 'contain'
  }
  
  // JPG/JPEG rarely have transparency
  return 'cover'
}