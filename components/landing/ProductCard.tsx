// ============================================================================
// app/(store)/components/ProductCard.tsx
// Dashboard-Style Product Card
// ============================================================================

import { Heart, ShoppingCart, Star } from 'lucide-react';
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package as PackageIcon } from "lucide-react";
import React from "react";
import Image from "next/image";
import { Button } from '../ui/button';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    images: string[];
    stock: number;
    category: { name: string; slug: string } | null;
    averageRating?: number;
    _count?: { reviews: number };
  };
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

const calculateDiscount = (price: number, comparePrice: number | null): number => {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const discount = calculateDiscount(product.price, product.comparePrice);
  const isOutOfStock = product.stock === 0;

  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-2 border-slate-200 hover:border-cyan-400 hover:shadow-2xl transition-all duration-300 h-full">
          <div className="aspect-square relative bg-slate-100 overflow-hidden">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PackageIcon className="w-16 h-16 text-slate-300" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {discount > 0 && (
                <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-lg">
                  -{discount}%
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="secondary" className="bg-slate-900 text-white">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-3 right-3 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"
            >
              <Heart className="w-5 h-5 text-slate-700 hover:text-red-500 transition-colors" />
            </motion.button>

            {/* Quick Add to Cart */}
            <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>

          <CardContent className="p-4 bg-white">
            {product.category && (
              <p className="text-xs text-cyan-600 font-semibold uppercase tracking-wider mb-2">
                {product.category.name}
              </p>
            )}
            
            <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors min-h-[3rem] text-base">
              {product.name}
            </h3>
            
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-bold text-slate-900">
                {formatPrice(product.price)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-sm text-slate-500 line-through">
                  {formatPrice(product.comparePrice)}
                </span>
              )}
            </div>

            {product.averageRating && product._count?.reviews ? (
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.averageRating!)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-600">
                  ({product._count.reviews})
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
};