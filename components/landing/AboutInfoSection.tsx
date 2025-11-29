'use client'

import React from 'react'
import Link from 'next/link'

export default function AboutInfoSection() {
  const features = [
    {
      id: 1,
      title: 'A community doing good',
      description: 'Our store is more than just a marketplace. We\'re building a community of passionate shoppers and sellers who believe in quality products and exceptional service. Together, we\'re creating positive change in the world of e-commerce.'
    },
    {
      id: 2,
      title: 'Support independent creators',
      description: 'There\'s no massive warehouse – just thousands of unique products from independent sellers. We make the whole process easy, helping you connect directly with makers to find something extraordinary.'
    },
    {
      id: 3,
      title: 'Peace of mind',
      description: 'Your privacy is the highest priority of our dedicated team. And if you ever need assistance, we are always ready to step in for support.'
    }
  ]

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f4e8]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif mb-4 text-[#2c2c2c]">
            What is Our Store?
          </h2>
          <Link 
            href="/about" 
            className="text-base sm:text-lg text-[#2c2c2c] underline hover:text-[#555] transition-colors"
          >
            Read our wonderfully weird story
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 mb-16 sm:mb-20">
          {features.map((feature) => (
            <div key={feature.id} className="text-left">
              <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-[#2c2c2c]">
                {feature.title}
              </h3>
              <p className="text-base sm:text-lg text-[#2c2c2c] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-semibold mb-6 text-[#2c2c2c]">
            Have a question? Well, we&#39;ve got some answers.
          </p>
          <Link
            href="/help"
            className="inline-block px-8 sm:px-10 py-3 sm:py-4 border-2 border-[#2c2c2c] text-[#2c2c2c] font-semibold rounded-full text-base sm:text-lg hover:bg-[#2c2c2c] hover:text-white transition-all duration-300"
          >
            Go to Help Center
          </Link>
        </div>
      </div>
    </section>
  )
}