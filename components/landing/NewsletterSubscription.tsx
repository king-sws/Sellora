/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'

export default function NewsletterSubscription() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  // Track UTM parameters for analytics
  const [utmParams, setUtmParams] = useState<{
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }>({})

  useEffect(() => {
    // Capture UTM parameters from URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setUtmParams({
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
      })
    }
  }, [])

  const handleSubmit = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      setMessageType('error')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMessage('Please enter a valid email address')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'homepage_banner',
          ...utmParams,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('🎉 Thank you for subscribing! Check your email for confirmation.')
        setMessageType('success')
        setEmail('')
        
        // Optional: Track conversion with analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'newsletter_signup', {
            event_category: 'engagement',
            event_label: 'homepage_banner',
          })
        }
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to subscribe. Please try again later.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <section className="bg-[#ccebff] py-8 sm:py-10 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Heading */}
        <p className="text-base sm:text-lg text-[#222] mb-6 sm:mb-8 font-medium">
          Yes! Send me exclusive offers, unique gift ideas, and personalized tips for shopping.
        </p>

        {/* Subscription Input */}
        <div className="max-w-xl mx-auto">
          <div className="relative flex items-center bg-white backdrop-blur-sm rounded-full shadow-sm overflow-hidden border border-white/80">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              disabled={isLoading}
              className="flex-1 px-6 py-3 sm:py-4 text-base text-gray-700 placeholder-gray-500 focus:outline-none bg-transparent disabled:opacity-60"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-black font-semibold rounded-full hover:bg-black hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                messageType === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}