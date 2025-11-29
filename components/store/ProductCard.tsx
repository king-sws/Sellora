// components/store/ProductCard.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { EnhancedWishlistButton } from '@/components/store/wishlist-button';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: string[];
  isFeatured?: boolean;
  salesCount?: number;
  rating: number;
  reviewCount: number;
  category: {
    name: string;
    slug: string;
  };
  brand?: {
    name: string;
    slug: string;
  };
}

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

// Star Rating Component
const StarRating = ({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative w-3 h-3">
            <Star className="w-3 h-3 fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-3 h-3 fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700" />
        ))}
      </div>
      {reviewCount > 0 && (
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const { data: session } = useSession();
  
  // Check if product is a TV - compute once at component initialization
  const isTVProduct = (() => {
    const name = product.name.toLowerCase();
    const tvKeywords = ['tv', 'television', 's25', 'smart tv', 's10'];
    return tvKeywords.some(keyword => name.includes(keyword));
  })();
  
  const [addingToCart, setAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(
    isTVProduct ? 'contain' : 'cover'
  );

  const discountPercent = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // If it's a TV product, keep it as 'contain' - don't analyze
    if (isTVProduct) {
      return;
    }

    const img = e.currentTarget;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    try {
      ctx.drawImage(img, 0, 0);
      
      const checkPoints = [
        { x: 0, y: 0 },
        { x: canvas.width - 1, y: 0 },
        { x: 0, y: canvas.height - 1 },
        { x: canvas.width - 1, y: canvas.height - 1 },
        { x: Math.floor(canvas.width / 2), y: 0 },
        { x: 0, y: Math.floor(canvas.height / 2) },
      ];

      let hasTransparency = false;
      let pureWhiteCorners = 0;

      for (const point of checkPoints) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
        
        if (pixel[3] < 255) {
          hasTransparency = true;
          break;
        }
        
        if (pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250) {
          pureWhiteCorners++;
        }
      }

      if (hasTransparency || pureWhiteCorners >= 4) {
        setImageStyle('contain');
      }
    } catch (err) {
      console.log('Could not analyze image, using cover');
    }
  };

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!session) {
      window.location.href = '/auth/sign-in';
      return;
    }

    if (isOutOfStock) return;

    try {
      setAddingToCart(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      if (response.ok) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // Grid View - eBay Style with proper grid structure
  if (viewMode === 'grid') {
    return (
      <div className="group bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow duration-200">
        {/* Grid Container with fixed structure */}
        <div className="grid grid-rows-[auto_auto_auto] h-full">
          
          {/* Image Section */}
          <Link href={`/products/${product.slug}`} className="block">
            <div className={`relative aspect-square overflow-hidden ${
              imageStyle === 'contain' ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <Image
                src={product.images[0] || '/placeholder.png'}
                alt={product.name}
                fill
                className={`group-hover:scale-105 transition-transform duration-300 ${
                  imageStyle === 'contain' ? 'object-contain p-3' : 'object-cover'
                }`}
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
              />
              
              {/* Discount Badge */}
              {discountPercent > 0 && (
                <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm z-10">
                  -{discountPercent}%
                </div>
              )}

              {/* Out of Stock Overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <span className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-semibold">
                    Out of Stock
                  </span>
                </div>
              )}
              
              {/* Wishlist Button */}
              <div 
                className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <EnhancedWishlistButton
                  productId={product.id}
                  size="sm"
                  variant="ghost"
                  iconOnly={true}
                  className="w-7 h-7 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-sm hover:shadow-md hover:scale-110 transition-all border border-gray-200/50 dark:border-gray-700/50"
                />
              </div>
            </div>
          </Link>

          {/* Product Info Section - Grid Layout */}
          <Link href={`/products/${product.slug}`} className="block">
            <div className="p-3">
              {/* Info Grid */}
              <div className="grid gap-2">
                
                {/* Price Row - Most Prominent */}
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-xs text-gray-400 line-through">
                      ${product.comparePrice.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Product Name Row */}
                <div className="min-h-[2.5rem]">
                  <h3 className="text-sm text-gray-700 dark:text-gray-300 leading-snug line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {product.name}
                  </h3>
                </div>

                {/* Rating Row */}
                {product.rating > 0 && (
                  <div>
                    <StarRating rating={product.rating} reviewCount={product.reviewCount} />
                  </div>
                )}

                {/* Stock Status Row */}
                {isLowStock && !isOutOfStock && (
                  <div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Only {product.stock} left
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Action Section */}
          <div className="p-3 pt-0">
            <Button
              onClick={addToCart}
              disabled={isOutOfStock || addingToCart}
              className="w-full h-9 text-sm font-medium rounded-md disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 transition-colors"
              size="sm"
            >
              {addingToCart ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : justAdded ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Added!
                </>
              ) : isOutOfStock ? (
                "Out of Stock"
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List View - Detailed Horizontal Layout
  return (
    <div className="group bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow ">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="grid grid-cols-[192px_1fr] gap-4 p-4">
          
          {/* Image Column */}
          <div className="relative w-48 h-48 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800">
            <Image
              src={product.images[0] || '/placeholder.png'}
              alt={product.name}
              fill
              className={`group-hover:scale-105 transition-transform duration-500 ${
                imageStyle === 'contain' ? 'object-contain p-4' : 'object-cover'
              }`}
              sizes="192px"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            
            {discountPercent > 0 && (
              <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-md z-10">
                SAVE {discountPercent}%
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                <span className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Product Details Column - Grid Layout */}
          <div className="flex flex-col justify-between min-w-0">
            <div className="grid gap-2">
              
              {/* Category Row */}
              {product.category && (
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {product.category.name}
                </p>
              )}

              {/* Product Name Row */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white transition-colors line-clamp-2">
                {product.name}
              </h3>

              {/* Rating Row */}
              {product.rating > 0 && (
                <div>
                  <StarRating rating={product.rating} reviewCount={product.reviewCount} />
                </div>
              )}

              {/* Price Row */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${product.price.toFixed(2)}
                </span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                    ${product.comparePrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Stock Status Row */}
              {isLowStock && !isOutOfStock && (
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Only {product.stock} left in stock
                </p>
              )}
            </div>

            {/* Actions Row */}
            <div className="grid grid-cols-[auto_1fr] gap-3 mt-4">
              <Button
                onClick={addToCart}
                disabled={isOutOfStock || addingToCart}
                className="px-6 py-2.5 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700"
                size="default"
              >
                {addingToCart ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : justAdded ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Added!
                  </>
                ) : isOutOfStock ? (
                  "Out of Stock"
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>

              <div onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}>
                <EnhancedWishlistButton
                  productId={product.id}
                  size="default"
                  variant="outline"
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}