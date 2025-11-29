'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function CategoryCardsSection() {
  const categories = [
    {
      id: 1,
      image: '/s-l2402.png',
      href: '/category/electronics/smartphones'
    },
    {
      id: 2,
      image: '/s-l2403.png',
      href: '/category/electronics/computers'
    },
    {
      id: 3,
      image: '/s-l2400.png',
      href: '/category/electronics/tablets'
    }
  ]

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="relative w-full h-64 sm:h-72 lg:h-80">
                <Image
                  src={category.image}
                  alt="Category"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}