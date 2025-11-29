// lib/category-banners-config.ts

export interface CategoryBanner {
  id: string;
  image: string;
  mobileImage?: string; // Optional separate image for mobile
  alt: string;
  link?: string; // Optional custom link

    overlay?: {
    title: string;
    subtitle?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
    position?: 'left' | 'center' | 'right' | 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
    theme?: 'light' | 'dark'; // Text color theme
    alignment?: 'left' | 'center' | 'right';
  };
}



export interface CategoryCustomContent {
  slug: string;
  
  // Hero Section - Can be single image or multiple banners
  heroBanners?: CategoryBanner[];
  
  // Promotional Cards - Like eBay's category cards
  promoCards?: CategoryBanner[];
  
  // Featured Section Images
  featuredSectionBanners?: CategoryBanner[];
  
  // Bottom promotional banners
  bottomBanners?: CategoryBanner[];
  
  // Custom accent color for buttons/links
  accentColor?: string;
}

export const categoryCustomContent: Record<string, CategoryCustomContent> = {
  'electronics': {
    slug: 'electronics',
    accentColor: '#0066FF',
    
    // Main hero banners (can be carousel)
    heroBanners: [
      {
        id: 'hero-1',
        image: '/image/electhome.png',
        mobileImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=600&fit=crop',
        alt: 'Latest Tech Deals - Up to 50% Off',
        link: '/products?category=electronics&featured=true'
      }
    ],
    
    // Promotional cards grid
    promoCards: [
      {
        id: 'promo-1',
        image: '/s-l2402.png',
        alt: 'Smartphones Collection',
        link: '/categories/electronics/smartphones'
      },
      {
        id: 'promo-2',
        image: '/s-l2403.png',
        alt: 'Laptops & Computers',
        link: '/categories/electronics/laptops'
      },
      {
        id: 'promo-3',
        image: '/s-l2400.png',
        alt: 'Tablets & iPads',
        link: '/categories/electronics/tablets'
      },
      
    ],
    
    
    
    // Bottom promotional banners
    bottomBanners: [
      {
        id: 'bottom-1',
        image: '/image/last1.png',
        alt: 'Extended Warranty Available'
      },
      {
        id: 'bottom-2',
        image: '/image/last1.png',
        alt: '24/7 Customer Support'
      }
    ]
  },
  
  'fashion': {
    slug: 'fashion',
    accentColor: '#FF1493',
    
    heroBanners: [
      {
        id: 'hero-1',
        image: '/image/clothing.png',
        mobileImage: '/image/clothing.png',
        alt: 'Spring Collection 2024'
      }
    ],
    
    promoCards: [
      {
        id: 'promo-1',
        image: '/clothing/women.png',
        alt: "Women's Fashion",
        link: '/categories/fashion/womens'
      },
      {
        id: 'promo-2',
        image: '/clothing/bage.png',
        alt: 'Bags & Luggage',
        link: '/categories/fashion/bags'
      },
      {
        id: 'promo-4',
        image: '/clothing/shoes.png',
        alt: 'Footwear Collection',
        link: '/categories/fashion/shoes'
      },
      {
        id: 'promo-3',
        image: '/clothing/man.png',
        alt: "Men's Fashion",
        link: '/categories/fashion/mens-clothing'
      },
      {
        id: 'promo-5',
        image: '/clothing/men-shoes.png',
        alt: "Kids' Fashion",
        link: '/categories/fashion/man-shoes'
      },
      {
        id: 'promo-6',
        image: '/clothing/accessories.png',
        alt: 'Fashion Accessories',
        link: '/categories/fashion/accessories'
      }
    ],
    
    featuredSectionBanners: [
      {
        id: 'featured-1',
        image: '/clothing/expo.png',
        alt: 'Trending Styles This Week'
      }
    ]
  },
  
  'home': {
    slug: 'home',
    accentColor: '#FF8C00',
    
    heroBanners: [
      {
        id: 'hero-1',
        image: '/clothing/home1.png',
        alt: 'Home Makeover Sale',
        overlay: {
          title: 'Just what your garden needs',
          subtitle: 'Discover BBQ, pools and garden furniture on eBay.',
          buttonText: 'Shop now',
          buttonLink: '/categories/home/garden',
          position: 'left',
          theme: 'light',
          alignment: 'left'
        }
      },
      
    ],
    
    featuredSectionBanners: [
      {
        id: 'promo-1',
        image: '/clothing/home2.png',
        alt: 'Furniture Collection',
        link: '/categories/home/furniture'
      },
      
    ]
  },
  
  'sports': {
    slug: 'sports',
    accentColor: '#00C853',
    

    
    promoCards: [
      {
        id: 'promo-1',
        image: '/sports/basketball.png',
        alt: 'Gym Equipment',
        link: '/categories/sports/basketball'
      },
      {
        id: 'promo-2',
        image: '/sports/football.png',
        alt: 'Outdoor Sports',
        link: '/categories/sports/football'
      },
      {
        id: 'promo-3',
        image: '/sports/soccer.png',
        alt: 'Sports Apparel',
        link: '/categories/sports/soccer'
      }
    ]
  },
  
  'books': {
    slug: 'books',
    accentColor: '#9C27B0',
    
    heroBanners: [
      {
        id: 'hero-1',
        image: '/book.jpg',
        alt: 'Bestselling Books'
      }
    ],
    
    promoCards: [
  {
    id: 'promo-1',
    image: '/books/books.png',
    alt: 'Fiction Collection',
    link: '/categories/books/books-magazines'
  },
  {
    id: 'promo-2',
    image: '/books/books2.png',
    alt: 'Non-Fiction',
    link: '/categories/books/movies-tv'
  },
  {
    id: 'promo-3',
    image: '/books/books3.png',
    alt: 'Educational Books',
    link: '/categories/books/music'
  },
  {
    id: 'promo-4',
    image: '/books/fantasy.png',
    alt: 'Fantasy Books',
    link: '/categories/books/fantasy'
  },
  {
    id: 'promo-5',
    image: '/books/horror.png',
    alt: 'Horror Books',
    link: '/categories/books/horror'
  },
  {
    id: 'promo-6',
    image: '/books/thriller.png',
    alt: 'Drama Collection',
    link: '/categories/books/thriller'
  }
],

  }
};

// Helper function to get category custom content
export function getCategoryCustomContent(slug: string): CategoryCustomContent | null {
  const baseSlug = slug.split('/')[0];
  return categoryCustomContent[baseSlug] || null;
}

// Helper to check if category has custom content
export function hasCustomContent(slug: string): boolean {
  const baseSlug = slug.split('/')[0];
  return baseSlug in categoryCustomContent;
}