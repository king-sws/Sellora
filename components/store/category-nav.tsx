
// components/store/category-nav.tsx (if you need it)
import Link from 'next/link'

interface CategoryNavProps {
  categories: Array<{
    id: string
    name: string
    slug: string
  }>
  currentCategory?: string
}

export function CategoryNav({ categories, currentCategory }: CategoryNavProps) {
  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      <Link
        href="/products"
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !currentCategory
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        All Products
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            currentCategory === category.slug
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  )
}
