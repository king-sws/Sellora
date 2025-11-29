// components/store/brand-sort-select.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface BrandSortSelectProps {
  currentSort?: string
}

export function BrandSortSelect({ currentSort }: BrandSortSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', value)
    params.delete('page') // Reset to page 1 when sorting changes
    router.push(`?${params.toString()}`)
  }

  return (
    <select
      className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={currentSort || 'newest'}
      onChange={(e) => handleSortChange(e.target.value)}
    >
      <option value="newest">Newest First</option>
      <option value="popular">Most Popular</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="name_asc">Name: A to Z</option>
    </select>
  )
}