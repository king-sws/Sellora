// app/(dashboard)/dashboard/products/new/page.tsx
import { prisma } from '@/db/prisma'
import { ProductForm } from '@/components/forms/product-form'

export const metadata = {
  title: 'Create Product',
  description: 'Add a new product to your store'
}

export default async function CreateProductPage() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true
      },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <div className="container mx-auto">
      <ProductForm 
        categories={categories}
        brands={brands}
      />
    </div>
  )
}