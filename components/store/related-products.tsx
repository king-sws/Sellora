// components/store/related-products.tsx
import { ProductCard } from './product-card'

interface RelatedProductsProps {
  products: Array<{
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: string[]
    category: { name: string } | null
    _count: { reviews: number }
  }>
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  // Remove this check since it's already done in the parent
  // if (products.length === 0) return null
  
  return (
    <div>
      {/* Removed border-t and pt-8 since heading is in parent */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}