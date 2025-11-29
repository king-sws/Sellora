// =========================================================
// types/category.ts
// =========================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  
  // Hierarchy
  parentId: string | null;
  parent?: CategoryParent | null;
  children?: CategoryChild[];
  
  // Relations
  products?: Product[];
  
  // Counts
  _count?: {
    products: number;
    children: number;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CategoryParent {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryChild {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  _count?: {
    products: number;
  };
}

export interface CategoryPath {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
  level?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string | null;
  images: string[];
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  brandId: string | null;
  brand?: {
    id: string;
    name: string;
    slug: string;
  };
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CategoryFormData {
  name: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
}

export interface CategoryFilters {
  search?: string;
  includeProducts?: boolean;
  includeDeleted?: boolean;
  includeChildren?: boolean;
  onlyParents?: boolean;
  parentId?: string | null;
}

export interface CategoryWithProducts extends Category {
  products: Product[];
  path?: CategoryPath[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CategoryResponse {
  category: Category;
  path?: CategoryPath[];
  products?: Product[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CategoryDeleteResponse {
  message: string;
  deleted: boolean;
  hard: boolean;
  category?: Category;
}