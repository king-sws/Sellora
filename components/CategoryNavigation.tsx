// components/CategoryNavigation.tsx - Categories Navigation Component
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: {
    products: number;
  };
}

interface CategoryNavigationProps {
  showTitle?: boolean;
  showProductCount?: boolean;
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'grid';
  limit?: number;
}

export default function CategoryNavigation({ 
  showTitle = true,
  showProductCount = true,
  className = '',
  variant = 'horizontal',
  limit
}: CategoryNavigationProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        // Filter categories with products and apply limit if specified
        const activeCategories = data.filter((cat: Category) => cat._count.products > 0);
        setCategories(limit ? activeCategories.slice(0, limit) : activeCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  const renderHorizontalLayout = () => (
    <div className={`${className}`}>
      {showTitle && (
        <h3 className="text-lg font-semibold mb-4">Shop by Category</h3>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`}>
            <Badge 
              variant="secondary" 
              className="whitespace-nowrap hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer px-4 py-2"
            >
              <Folder className="h-3 w-3 mr-2" />
              {category.name}
              {showProductCount && (
                <span className="ml-2 text-xs opacity-70">
                  ({category._count.products})
                </span>
              )}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );

  const renderVerticalLayout = () => (
    <div className={className}>
      {showTitle && (
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
      )}
      <div className="space-y-1">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`}>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <Folder className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                <span className="font-medium group-hover:text-blue-600">
                  {category.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {showProductCount && (
                  <Badge variant="secondary" className="text-xs">
                    {category._count.products}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  const renderGridLayout = () => (
    <div className={className}>
      {showTitle && (
        <h3 className="text-2xl font-bold mb-6 text-center">Shop by Category</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`}>
            <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Folder className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h4>
                {category.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {category.description}
                  </p>
                )}
                {showProductCount && (
                  <Badge variant="secondary">
                    {category._count.products} {category._count.products === 1 ? 'Product' : 'Products'}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );

  switch (variant) {
    case 'vertical':
      return renderVerticalLayout();
    case 'grid':
      return renderGridLayout();
    default:
      return renderHorizontalLayout();
  }
}



