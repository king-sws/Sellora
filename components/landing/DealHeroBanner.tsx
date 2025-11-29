/* eslint-disable react/no-unescaped-entities */
'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function DealHeroBanner() {
  return (
    <section className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] mb-10 overflow-hidden">
      {/* Background Image */}
      <Image
        src="/s-l1600.png"
        alt="Deal Banner"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      
      {/* Overlay Content */}
      <div className="relative z-10 h-full flex items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6">
              There's a deal for you, too
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-white mb-6 sm:mb-8">
              Don't miss a chance to save on items you've been looking for.
            </p>
            <Link
              href="/deals"
              className="inline-block bg-white text-[#0a3a5c] font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base hover:bg-gray-100 transition-colors"
            >
              Explore now
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}