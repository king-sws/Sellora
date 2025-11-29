/* eslint-disable react/no-unescaped-entities */
"use client"
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function UnsubscribeContent() {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUnsubscribed, setIsUnsubscribed] = useState(false)
  const [error, setError] = useState('')
  
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  const handleUnsubscribe = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/newsletter/subscribe?email=${encodeURIComponent(email)}&reason=${encodeURIComponent(reason)}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (response.ok) {
        setIsUnsubscribed(true)
      } else {
        setError(data.error || 'Failed to unsubscribe. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isUnsubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You've Been Unsubscribed
          </h1>
          
          <p className="text-gray-600 mb-6">
            We're sorry to see you go. You will no longer receive newsletter emails from Sellora.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-[#222] text-white font-semibold rounded-full hover:bg-black transition-colors"
            >
              Return to Homepage
            </Link>
            
            <button
              onClick={() => {
                setIsUnsubscribed(false)
                setEmail('')
                setReason('')
              }}
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors"
            >
              Changed Your Mind? Resubscribe
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unsubscribe from Newsletter
          </h1>
          <p className="text-gray-600">
            We're sorry to see you go. Please confirm your email to unsubscribe.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222] focus:border-transparent outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Unsubscribing (Optional)
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222] focus:border-transparent outline-none"
              disabled={isLoading}
            >
              <option value="">Select a reason</option>
              <option value="too_frequent">Emails are too frequent</option>
              <option value="not_relevant">Content is not relevant</option>
              <option value="never_signed_up">I never signed up</option>
              <option value="privacy_concerns">Privacy concerns</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUnsubscribe}
            disabled={isLoading || !email}
            className="w-full px-6 py-3 bg-[#222] text-white font-semibold rounded-full hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
          </button>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel and return to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}