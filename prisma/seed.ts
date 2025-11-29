// prisma/seed-categories.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CategoryData {
  name: string
  slug: string
  description: string
  image: string
  children?: {
    name: string
    slug: string
    description: string
    image: string
  }[]
}

const categories: CategoryData[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest electronics, gadgets, and technology products',
    image: '/elect.png',
    children: [
      {
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Latest smartphones and mobile devices from top brands',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop'
      },
      {
        name: 'Laptops',
        slug: 'laptops',
        description: 'High-performance laptops for work, gaming, and everyday use',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop'
      },
      {
        name: 'Tablets',
        slug: 'tablets',
        description: 'Portable tablets for productivity and entertainment',
        image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=300&fit=crop'
      },
      {
        name: 'Headphones',
        slug: 'headphones',
        description: 'Premium headphones and audio accessories',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'
      },
      {
        name: 'Cameras',
        slug: 'cameras',
        description: 'Digital cameras, DSLRs, and photography equipment',
        image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop'
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        description: 'Gaming consoles, accessories, and gaming gear',
        image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&h=300&fit=crop'
      }
    ]
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trendy clothing, accessories, and fashion items',
    image: '/fash.png',
    children: [
      {
        name: "Men's Clothing",
        slug: 'mens-clothing',
        description: 'Stylish clothing and apparel for men',
        image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&h=300&fit=crop'
      },
      {
        name: "Women's Clothing",
        slug: 'womens-clothing',
        description: 'Fashion-forward clothing and apparel for women',
        image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=300&fit=crop'
      },
      {
        name: 'Shoes',
        slug: 'shoes',
        description: 'Footwear for all occasions and styles',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop'
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Fashion accessories including bags, belts, and more',
        image: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=400&h=300&fit=crop'
      },
      {
        name: 'Watches',
        slug: 'watches',
        description: 'Luxury and casual watches for every style',
        image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=300&fit=crop'
      },
      {
        name: 'Jewelry',
        slug: 'jewelry',
        description: 'Fine jewelry and fashion jewelry pieces',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop'
      }
    ]
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Everything for your home and garden',
    image: '/home.png',
    children: [
      {
        name: 'Furniture',
        slug: 'furniture',
        description: 'Quality furniture for every room in your home',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop'
      },
      {
        name: 'Decor',
        slug: 'decor',
        description: 'Home decor and decorative accessories',
        image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=300&fit=crop'
      },
      {
        name: 'Kitchen',
        slug: 'kitchen',
        description: 'Kitchen appliances, cookware, and utensils',
        image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop'
      },
      {
        name: 'Bedding',
        slug: 'bedding',
        description: 'Comfortable bedding and bedroom essentials',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=300&fit=crop'
      },
      {
        name: 'Garden',
        slug: 'garden',
        description: 'Garden tools, plants, and outdoor living',
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop'
      },
      {
        name: 'Storage',
        slug: 'storage',
        description: 'Storage solutions and organization products',
        image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&h=300&fit=crop'
      }
    ]
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Sports equipment and athletic gear',
    image: '/sport.png',
    children: [
      {
        name: 'Fitness Equipment',
        slug: 'fitness-equipment',
        description: 'Home gym equipment and fitness accessories',
        image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop'
      },
      {
        name: 'Outdoor Sports',
        slug: 'outdoor-sports',
        description: 'Equipment for outdoor activities and adventures',
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop'
      },
      {
        name: 'Cycling',
        slug: 'cycling',
        description: 'Bicycles, cycling gear, and accessories',
        image: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=400&h=300&fit=crop'
      },
      {
        name: 'Yoga',
        slug: 'yoga',
        description: 'Yoga mats, blocks, and wellness accessories',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop'
      },
      {
        name: 'Team Sports',
        slug: 'team-sports',
        description: 'Equipment for basketball, soccer, and team activities',
        image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=300&fit=crop'
      },
      {
        name: 'Activewear',
        slug: 'activewear',
        description: 'Athletic clothing and performance wear',
        image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=300&fit=crop'
      }
    ]
  },
  {
    name: 'Books',
    slug: 'books',
    description: 'Books, magazines, and reading materials',
    image: '/book.png',
    children: [
      {
        name: 'Fiction',
        slug: 'fiction',
        description: 'Novels, short stories, and fiction literature',
        image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop'
      },
      {
        name: 'Non-Fiction',
        slug: 'non-fiction',
        description: 'Biographies, history, and informational books',
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop'
      },
      {
        name: 'Children',
        slug: 'children-books',
        description: "Children's books and educational materials",
        image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop'
      },
      {
        name: 'Education',
        slug: 'education',
        description: 'Educational books and learning resources',
        image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop'
      },
      {
        name: 'Comics',
        slug: 'comics',
        description: 'Comic books, graphic novels, and manga',
        image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=300&fit=crop'
      },
      {
        name: 'Magazines',
        slug: 'magazines',
        description: 'Current magazines and periodicals',
        image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop'
      }
    ]
  }
]

async function seedCategories() {
  console.log('🌱 Starting categories seeding...')

  try {
    // Clear existing categories (optional - remove if you want to keep existing data)
    console.log('🧹 Clearing existing categories...')
    const deletedCount = await prisma.category.deleteMany({})
    console.log(`✅ Deleted ${deletedCount.count} existing categories`)

    // Create categories
    console.log('📦 Creating categories...')
    const createdCategories = []
    const createdSubcategories = []

    for (const categoryData of categories) {
      // Create parent category
      const parentCategory = await prisma.category.create({
        data: {
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description,
          image: categoryData.image
        }
      })
      createdCategories.push(parentCategory)
      console.log(`✅ Created parent category: ${parentCategory.name}`)

      // Create child categories
      if (categoryData.children && categoryData.children.length > 0) {
        for (const childData of categoryData.children) {
          const childCategory = await prisma.category.create({
            data: {
              name: childData.name,
              slug: childData.slug,
              description: childData.description,
              image: childData.image,
              parentId: parentCategory.id
            }
          })
          createdSubcategories.push({
            ...childCategory,
            parentName: parentCategory.name
          })
          console.log(`  ↳ Created subcategory: ${childCategory.name}`)
        }
      }
    }

    console.log('\n🎉 Category seeding completed successfully!')
    console.log(`📊 Total parent categories created: ${createdCategories.length}`)
    console.log(`📊 Total subcategories created: ${createdSubcategories.length}`)

    // Display summary
    console.log('\n📋 Category Hierarchy:')
    for (const parent of createdCategories) {
      console.log(`\n${parent.name} (${parent.slug})`)
      const children = createdSubcategories.filter(c => c.parentName === parent.name)
      children.forEach((child, index) => {
        const isLast = index === children.length - 1
        const prefix = isLast ? '└──' : '├──'
        console.log(`  ${prefix} ${child.name} (${child.slug})`)
      })
    }

    return { createdCategories, createdSubcategories }
  } catch (error) {
    console.error('❌ Error seeding categories:', error)
    throw error
  }
}

// Execute seed function
seedCategories()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('\n👋 Database connection closed')
  })