
// components/store/SocialShare.tsx
'use client'

import { Share2, Facebook, Twitter, Link as LinkIcon, Check } from 'lucide-react'
import { useState } from 'react'

interface SocialShareProps {
  productName: string
  productUrl: string
}

export function SocialShare({ productName, productUrl }: SocialShareProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${productUrl}`
    : productUrl

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(productName)}`,
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-full mt-2 right-0 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-2 z-20 min-w-[200px]">
            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium text-gray-700"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              Facebook
            </a>
            <a
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium text-gray-700"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              Twitter
            </a>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium text-gray-700"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="w-5 h-5 text-gray-600" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}