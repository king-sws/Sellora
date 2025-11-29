'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function AccessoriesHeroSection() {
  const products = [
    { id: 1, image: '/image/labo.png', alt: 'Racing Seat' },
    { id: 2, image: '/image/china.png', alt: 'Floor Mats' },
    { id: 3, image: '/image/head.png', alt: 'LED Light Bar' }
  ]

  return (
    <section className="relative bg-gradient-to-b from-black via-[#0a0a0a] to-[#111] py-16 sm:py-20 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-white"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight mb-6">
            Endless <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">accessories</span>.<br />
            Epic prices.
          </h1>
          <p className="text-[14px] text-gray-400 max-w-md mb-8">
            Upgrade your ride with the latest gear, lighting, and interiors — all at unbeatable prices.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 rounded-full font-semibold text-base sm:text-lg 
              bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-[0_4px_14px_rgba(255,170,0,0.3)]
              transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_20px_rgba(255,170,0,0.4)]"
          >
            Shop now →
          </Link>
        </motion.div>

        {/* Right Content */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          className="flex items-center justify-center gap-6 sm:gap-8"
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              whileHover={{ scale: 1.08, y: -4 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className={`relative flex justify-center items-center 
                w-28 h-40 sm:w-36 sm:h-48 md:w-44 md:h-56 lg:w-52 lg:h-64
                ${index === 0 ? 'rotate-[-6deg]' : ''}
                ${index === 1 ? 'z-10 scale-110' : ''}
                ${index === 2 ? 'rotate-[6deg]' : ''}
              `}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 blur-2xl opacity-40 rounded-full"></div>
              <Image
                src={product.image}
                alt={product.alt}
                fill
                className="object-contain drop-shadow-[0_8px_15px_rgba(255,255,255,0.15)]"
                sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, (max-width: 1024px) 176px, 208px"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
