'use client'

import { Heart, Share2, Loader2, Check, Copy, Facebook, Twitter, Mail, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface QuickActionsProps {
  productId: string
  productName: string
  productImage?: string
}

export function QuickActions({ productId, productName, productImage }: QuickActionsProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [checkingWishlist, setCheckingWishlist] = useState(true)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [justCopied, setJustCopied] = useState(false)

  const fullUrl = typeof window !== 'undefined' 
    ? window.location.href
    : ''

  // Check if product is in wishlist on mount
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!session) {
        setCheckingWishlist(false)
        return
      }

      try {
        const response = await fetch(`/api/wishlist/check/${productId}`)
        if (response.ok) {
          const data = await response.json()
          setIsWishlisted(data.isWishlisted)
        }
      } catch (error) {
        console.error('Failed to check wishlist status:', error)
      } finally {
        setCheckingWishlist(false)
      }
    }

    checkWishlistStatus()
  }, [session, productId])

  const handleAddToWishlist = async () => {
    if (!session) {
      router.push(`/auth/sign-in?redirect=/products/${productId}`)
      toast.info('Please sign in to add items to wishlist')
      return
    }

    setWishlistLoading(true)
    try {
      const response = await fetch(`/api/wishlist`, {
        method: isWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      if (!response.ok) throw new Error('Failed to update wishlist')

      const data = await response.json()
      setIsWishlisted(!isWishlisted)
      
      toast.success(
        isWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        { 
          description: isWishlisted 
            ? 'Product removed from your wishlist' 
            : 'You can view it in your wishlist page'
        }
      )
    } catch (error) {
      toast.error('Failed to update wishlist', {
        description: 'Please try again later'
      })
    } finally {
      setWishlistLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setJustCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setJustCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(fullUrl)
    const text = encodeURIComponent(`Check out ${productName}`)
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      email: `mailto:?subject=${text}&body=${url}`,
    }

    if (urls[platform as keyof typeof urls]) {
      window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400')
      setShowShareMenu(false)
      toast.success(`Opening ${platform}...`)
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          disabled={wishlistLoading || checkingWishlist}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border-2 rounded-lg transition-all duration-200 text-sm font-semibold whitespace-nowrap ${
            isWishlisted
              ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {wishlistLoading || checkingWishlist ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">
                {checkingWishlist ? 'Checking...' : 'Processing...'}
              </span>
            </>
          ) : (
            <>
              <Heart 
                className={`w-4 h-4 transition-all ${
                  isWishlisted ? 'fill-current scale-110' : ''
                }`} 
              />
              <span className="hidden sm:inline">
                {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </span>
              <span className="sm:hidden">
                {isWishlisted ? 'Saved' : 'Wishlist'}
              </span>
            </>
          )}
        </button>

        {/* Share Button */}
        <div className="relative flex-1 sm:flex-initial">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm font-semibold text-gray-700 whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {/* Share Menu Dropdown */}
          {showShareMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowShareMenu(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">Share this product</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Choose your preferred method</p>
                </div>
                
                <div className="p-2 space-y-1">
                  {/* Copy Link */}
                  <button
                    onClick={copyToClipboard}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    {justCopied ? (
                      <>
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-sm text-green-600">Copied!</p>
                          <p className="text-xs text-gray-500">Link copied to clipboard</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                          <Copy className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-sm text-gray-900">Copy Link</p>
                          <p className="text-xs text-gray-500">Share via clipboard</p>
                        </div>
                      </>
                    )}
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Facebook className="w-5 h-5 text-blue-600 fill-current" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm text-gray-900">Facebook</p>
                      <p className="text-xs text-gray-500">Share on Facebook</p>
                    </div>
                  </button>

                  {/* Twitter */}
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sky-50 rounded-lg transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Twitter className="w-5 h-5 text-sky-600 fill-current" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm text-gray-900">Twitter</p>
                      <p className="text-xs text-gray-500">Share on Twitter</p>
                    </div>
                  </button>

                  {/* Email */}
                  <button
                    onClick={() => shareToSocial('email')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 rounded-lg transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm text-gray-900">Email</p>
                      <p className="text-xs text-gray-500">Share via email</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sign in prompt for wishlist */}
      {!session && (
        <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
          <button
            onClick={() => router.push(`/auth/sign-in?redirect=/products/${productId}`)}
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            Sign in
          </button>
          {' '}to save items to your wishlist
        </p>
      )}
    </div>
  )
}