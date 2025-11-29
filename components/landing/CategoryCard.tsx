// ============================================================================
// app/(store)/components/CategoryCard.tsx
// Dashboard-Style Category Card
// ============================================================================

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package as PackageIcon } from "lucide-react";
import React from "react";
import Image from "next/image";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    _count?: { products: number };
  };
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link href={`/categories/${category.slug}`} className="block group">
      <motion.div
        whileHover={{ y: -8, scale: 1.03 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-2 border-slate-200 hover:border-cyan-400 hover:shadow-2xl transition-all duration-300">
          <div className="aspect-square relative bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PackageIcon className="w-16 h-16 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Hover Badge */}
            <div className="absolute bottom-4 left-4 right-4 transform translate-y-8 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Badge className="w-full justify-center bg-white text-slate-900 hover:bg-white py-2">
                View Products
                <ArrowRight className="w-4 h-4 ml-2" />
              </Badge>
            </div>
          </div>
          
          <CardContent className="p-4 text-center bg-white">
            <h3 className="font-bold text-slate-900 group-hover:text-cyan-600 transition-colors text-lg">
              {category.name}
            </h3>
            {category._count && (
              <p className="text-sm text-slate-500 mt-1">
                {category._count.products} products
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
};