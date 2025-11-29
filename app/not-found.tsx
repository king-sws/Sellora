/* eslint-disable react/no-unescaped-entities */
'use client'
import Link from 'next/link'

export default function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="mx-auto w-full max-w-3xl text-center space-y-8">

        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-gray-300 flex items-center justify-center shadow-sm">
            <svg
              className="w-8 h-8 text-gray-700 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Something New Is Coming
          </h1>

          <p className="text-lg md:text-xl text-gray-600 leading-relaxed mx-auto max-w-xl">
            We’re building this page to bring you an improved experience. Check back soon for updates.
          </p>
        </div>

        {/* Divider */}
        <div className="mx-auto h-px w-28 bg-gray-200"></div>

        {/* Button */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-gray-900 px-6 py-3 font-medium text-gray-900 hover:bg-gray-900 hover:text-white transition duration-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back Home
          </Link>
        </div>

        {/* Footer Note */}
        <p className="pt-6 text-sm text-gray-400">
          Thanks for your patience — we’re working hard behind the scenes.
        </p>
      </div>
    </div>
  )
}
