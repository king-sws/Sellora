/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
// app/(dashboard)/categories/page.tsx - Enhanced with Essential Features
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Package,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  MoreVertical,
  Filter,
  Grid,
  List,
  ArrowUpDown,
  Calendar,
  Hash,
  FileText,
  X,
  FolderTree,
  ChevronRight,
  Copy,
  CheckSquare,
  Square
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CategoryImageUploader } from '@/components/admin/CategoryImageUploader';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    products: number;
    children: number;
  };
}

interface CategoryFormData {
  name: string;
  description: string;
  image: string;
  parentId: string | null;
}

type SortOption = 'name' | 'createdAt' | 'updatedAt' | 'productCount';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

// Skeleton Loader Component
const CategoryCardSkeleton = () => (
  <Card className="overflow-hidden animate-pulse">
    <div className="relative h-48 w-full bg-gray-200" />
    <CardHeader className="pb-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded-full w-16" />
        <div className="h-6 bg-gray-200 rounded-full w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </CardContent>
  </Card>
);

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ 
    name: '', 
    description: '',
    image: '',
    parentId: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string; parentId?: string }>({});
  
  // NEW: Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N for new category
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openCreateDialog();
      }
      // Forward slash for search focus
      if (e.key === '/' && !isDialogOpen) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      // Escape to clear selection
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDialogOpen, selectedIds.size]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCategories();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, showDeleted]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeDeleted: showDeleted.toString(),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/categories?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  }, [showDeleted, searchTerm]);

  // Get available parent categories (exclude current category and its descendants)
  const availableParentCategories = useMemo(() => {
    if (!selectedCategory) {
      return categories.filter(c => !c.deletedAt);
    }
    
    const excludedIds = new Set([selectedCategory.id]);
    
    const findDescendants = (parentId: string) => {
      categories
        .filter(c => c.parentId === parentId)
        .forEach(child => {
          excludedIds.add(child.id);
          findDescendants(child.id);
        });
    };
    
    findDescendants(selectedCategory.id);
    
    return categories.filter(c => !c.deletedAt && !excludedIds.has(c.id));
  }, [categories, selectedCategory]);

  const validateForm = (): boolean => {
    const errors: { name?: string; description?: string; parentId?: string } = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Category name must be less than 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const url = selectedCategory 
        ? `/api/categories/${selectedCategory.id}` 
        : '/api/categories';
      const method = selectedCategory ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok) {
        await fetchCategories();
        setIsDialogOpen(false);
        setFormData({ name: '', description: '', image: '', parentId: null });
        setFormErrors({});
        setSelectedCategory(null);
        
        toast.success(`Category ${selectedCategory ? 'updated' : 'created'} successfully`);
      } else {
        toast.error(responseData.error || `Failed to ${selectedCategory ? 'update' : 'create'} category`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(`Failed to ${selectedCategory ? 'update' : 'create'} category`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      setIsSubmitting(true);
      const url = `/api/categories/${selectedCategory.id}${deleteType === 'hard' ? '?hard=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      const responseData = await response.json();

      if (response.ok) {
        await fetchCategories();
        setIsDeleteDialogOpen(false);
        setSelectedCategory(null);
        
        toast.success(`Category ${deleteType === 'hard' ? 'permanently deleted' : 'moved to trash'}`);
      } else {
        toast.error(responseData.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Bulk delete handler
  const handleBulkDelete = async () => {
    try {
      setIsSubmitting(true);
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/categories/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      await fetchCategories();
      setSelectedIds(new Set());
      setIsBulkDeleteOpen(false);
      
      toast.success(`${selectedIds.size} categories moved to trash`);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Failed to delete categories');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Bulk restore handler
  const handleBulkRestore = async () => {
    try {
      const restorePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/categories/${id}/restore`, { method: 'PATCH' })
      );
      
      await Promise.all(restorePromises);
      await fetchCategories();
      setSelectedIds(new Set());
      
      toast.success(`${selectedIds.size} categories restored`);
    } catch (error) {
      console.error('Error bulk restoring:', error);
      toast.error('Failed to restore categories');
    }
  };

  const handleRestore = async (category: Category) => {
    try {
      const response = await fetch(`/api/categories/${category.id}/restore`, {
        method: 'PATCH',
      });

      const responseData = await response.json();

      if (response.ok) {
        await fetchCategories();
        toast.success('Category restored successfully');
      } else {
        toast.error(responseData.error || 'Failed to restore category');
      }
    } catch (error) {
      console.error('Error restoring category:', error);
      toast.error('Failed to restore category');
    }
  };

  // NEW: Duplicate category
  const handleDuplicate = (category: Category) => {
    setSelectedCategory(null);
    setFormData({
      name: `${category.name} (Copy)`,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || null
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || null
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '', image: '', parentId: null });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setDeleteType(category._count.products > 0 ? 'soft' : 'soft');
    setIsDeleteDialogOpen(true);
  };

  // NEW: Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // NEW: Select all
  const toggleSelectAll = () => {
    if (selectedIds.size === processedCategories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedCategories.map(c => c.id)));
    }
  };

  // Memoized sorted and filtered categories
  const processedCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'productCount':
          aValue = a._count.products;
          bValue = b._count.products;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    });

    return sorted.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, sortBy, sortOrder, searchTerm]);

  const activeFilters = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (showDeleted) count++;
    return count;
  }, [searchTerm, showDeleted]);

  const clearFilters = () => {
    setSearchTerm('');
    setShowDeleted(false);
  };

  // Get breadcrumb path for a category
  const getCategoryPath = (category: Category): string => {
    if (!category.parent) return category.name;
    const parentCategory = categories.find(c => c.id === category.parentId);
    if (!parentCategory) return category.name;
    return `${getCategoryPath(parentCategory)} > ${category.name}`;
  };

  // NEW: Get initials for placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // NEW: Get color for placeholder based on name
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Mobile action sheet component
  const CategoryActions = ({ category }: { category: Category }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {category.deletedAt ? (
          <DropdownMenuItem
            onClick={() => handleRestore(category)}
            className="text-green-600 focus:text-green-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restore
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => openEditDialog(category)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(category)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openDeleteDialog(category)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage product categories for your store
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+N</kbd>
            <span>New category</span>
            <kbd className="px-2 py-1 bg-gray-100 border rounded">/</kbd>
            <span>Search</span>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === processedCategories.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {showDeleted ? (
                  <Button
                    onClick={handleBulkRestore}
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restore Selected
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsBulkDeleteOpen(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedIds(new Set())}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Controls */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-input"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Mobile filters toggle */}
              <div className="flex items-center gap-2 sm:hidden">
                <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="relative">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {activeFilters > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                          {activeFilters}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[400px]">
                    <SheetHeader>
                      <SheetTitle>Filters & Sorting</SheetTitle>
                      <SheetDescription>
                        Customize how categories are displayed
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Sort by</label>
                        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="createdAt">Created Date</SelectItem>
                            <SelectItem value="updatedAt">Updated Date</SelectItem>
                            <SelectItem value="productCount">Product Count</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="w-full"
                        >
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium">View Mode</label>
                        <div className="flex gap-2">
                          <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            onClick={() => setViewMode('grid')}
                            className="flex-1"
                          >
                            <Grid className="h-4 w-4 mr-2" />
                            Grid
                          </Button>
                          <Button
                            variant={viewMode === 'list' ? 'default' : 'outline'}
                            onClick={() => setViewMode('list')}
                            className="flex-1"
                          >
                            <List className="h-4 w-4 mr-2" />
                            List
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show deleted categories</label>
                        <Switch
                          checked={showDeleted}
                          onCheckedChange={setShowDeleted}
                        />
                      </div>

                      {activeFilters > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="w-full"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>

                <Button onClick={fetchCategories} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Desktop controls */}
            <div className="hidden sm:flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Sort by:</label>
                  <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="createdAt">Created</SelectItem>
                      <SelectItem value="updatedAt">Updated</SelectItem>
                      <SelectItem value="productCount">Products</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-deleted"
                    checked={showDeleted}
                    onCheckedChange={setShowDeleted}
                  />
                  <label htmlFor="show-deleted" className="text-sm flex items-center gap-1">
                    {showDeleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Show deleted
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Button onClick={fetchCategories} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active filters indicator */}
      {activeFilters > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <span>Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchTerm}
              <button onClick={() => setSearchTerm('')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {showDeleted && (
            <Badge variant="secondary" className="gap-1">
              Show deleted
              <button onClick={() => setShowDeleted(false)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-6">
            Clear all
          </Button>
        </div>
      )}

      {/* Categories Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : processedCategories.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || activeFilters > 0 ? 'No categories found' : 'No categories yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || activeFilters > 0
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  : 'Get started by creating your first product category to organize your inventory.'
                }
              </p>
              {!searchTerm && activeFilters === 0 ? (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Category
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {processedCategories.map((category) => (
              <Card 
                key={category.id} 
                className={`group hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col ${
                  selectedIds.has(category.id) ? 'ring-2 ring-blue-500' : ''
                } ${
                  category.deletedAt 
                    ? 'opacity-60 border-red-200 bg-red-50/50' 
                    : 'hover:shadow-md border-gray-200 bg-white'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedIds.has(category.id)}
                    onCheckedChange={() => toggleSelection(category.id)}
                    className="bg-white shadow-md"
                  />
                </div>

                {/* Category Image or Placeholder */}
                {category.image ? (
                  <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                ) : (
                  <div className={`relative h-48 w-full flex items-center justify-center ${getColorFromName(category.name)}`}>
                    <div className="text-white">
                      <div className="text-5xl font-bold mb-2">{getInitials(category.name)}</div>
                      <div className="text-sm opacity-90">{category.name}</div>
                    </div>
                  </div>
                )}

                <CardHeader className="pb-3 space-y-2">
                  {/* Title Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg font-semibold truncate mb-1">
                        {category.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 truncate">
                        /{category.slug}
                      </p>
                    </div>
                    
                    {/* Actions Dropdown */}
                    <div className="flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <CategoryActions category={category} />
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {category.deletedAt && (
                      <Badge variant="destructive" className="text-xs">
                        Deleted
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                      <Package className="h-3 w-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">
                        {category._count.products}
                      </span>
                    </div>
                    {category._count.children > 0 && (
                      <div className="flex items-center gap-1 bg-blue-100 rounded-full px-2 py-1">
                        <FolderTree className="h-3 w-3 text-blue-400" />
                        <span className="text-xs font-medium text-blue-600">
                          {category._count.children}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Parent Category */}
                  {category.parent && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      <FolderTree className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{category.parent.name}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col">
                  {/* Description */}
                  {category.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  
                  {/* Metadata */}
                  <div className="text-xs text-gray-500 mb-4 space-y-1 mt-auto">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Created {new Date(category.createdAt).toLocaleDateString()}</span>
                    </div>
                    {category.updatedAt !== category.createdAt && (
                      <div className="flex items-center gap-1">
                        <Edit className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Updated {new Date(category.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {category.deletedAt && (
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <Trash2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Deleted {new Date(category.deletedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile action buttons */}
                  <div className="flex gap-2 sm:hidden">
                    {category.deletedAt ? (
                      <Button
                        onClick={() => handleRestore(category)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => openEditDialog(category)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => openDeleteDialog(category)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {processedCategories.map((category) => (
                  <div 
                    key={category.id}
                    className={`p-4 hover:bg-gray-50/50 transition-colors ${
                      selectedIds.has(category.id) ? 'bg-blue-50/50' : ''
                    } ${
                      category.deletedAt ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedIds.has(category.id)}
                          onCheckedChange={() => toggleSelection(category.id)}
                        />
                        
                        {/* Image/Placeholder */}
                        {category.image ? (
                          <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className={`w-12 h-12 rounded flex items-center justify-center ${getColorFromName(category.name)} flex-shrink-0`}>
                            <span className="text-white font-bold text-sm">{getInitials(category.name)}</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {category.name}
                            </h3>
                            {category.deletedAt && (
                              <Badge variant="destructive" className="text-xs">
                                Deleted
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                              <Package className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-medium text-gray-600">
                                {category._count.products}
                              </span>
                            </div>
                            {category._count.children > 0 && (
                              <div className="flex items-center gap-1 bg-blue-100 rounded-full px-2 py-1">
                                <FolderTree className="h-3 w-3 text-blue-400" />
                                <span className="text-xs font-medium text-blue-600">
                                  {category._count.children}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-500 space-y-1">
                            {category.parent && (
                              <div className="flex items-center gap-1">
                                <FolderTree className="h-3 w-3" />
                                <span>{getCategoryPath(category)}</span>
                              </div>
                            )}
                            <p>/{category.slug}</p>
                            {category.description && (
                              <p className="line-clamp-1">{category.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <span>Created {new Date(category.createdAt).toLocaleDateString()}</span>
                              {category.updatedAt !== category.createdAt && (
                                <span>Updated {new Date(category.updatedAt).toLocaleDateString()}</span>
                              )}
                              {category.deletedAt && (
                                <span className="text-red-600">
                                  Deleted {new Date(category.deletedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Desktop action buttons */}
                        <div className="hidden sm:flex items-center gap-2">
                          {category.deletedAt ? (
                            <Button
                              onClick={() => handleRestore(category)}
                              variant="outline"
                              size="sm"
                              className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={() => openEditDialog(category)}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => openDeleteDialog(category)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {/* Mobile dropdown */}
                        <div className="sm:hidden">
                          <CategoryActions category={category} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl w-full mx-4 sm:mx-auto rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              {selectedCategory ? (
                <>
                  <Edit className="h-5 w-5 text-blue-500" />
                  Edit Category
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-green-500" />
                  Create Category
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: undefined });
                  }
                }}
                placeholder="Enter category name"
                className={`rounded-md ${formErrors.name ? "border-red-500 focus:ring-red-500" : ""}`}
                maxLength={100}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Parent Category Field */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Parent Category
              </label>
              <Select 
                value={formData.parentId || "none"} 
                onValueChange={(value) => {
                  setFormData({ ...formData, parentId: value === "none" ? null : value });
                  if (formErrors.parentId) {
                    setFormErrors({ ...formErrors, parentId: undefined });
                  }
                }}
              >
                <SelectTrigger className={formErrors.parentId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select parent category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-gray-400" />
                      <span>No Parent (Root Category)</span>
                    </div>
                  </SelectItem>
                  {availableParentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        {cat.parentId && <ChevronRight className="h-3 w-3 text-gray-400" />}
                        <span>{getCategoryPath(cat)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.parentId && (
                <p className="text-red-500 text-xs mt-1">{formErrors.parentId}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.parentId 
                  ? `Will create nested category under "${availableParentCategories.find(c => c.id === formData.parentId)?.name}"`
                  : "This will be a root-level category"
                }
              </p>
            </div>

            {/* Category Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Category Image
              </label>
              <CategoryImageUploader
                currentImage={formData.image || null}
                onImageChange={(imageUrl) => {
                  setFormData({ ...formData, image: imageUrl });
                }}
                onImageRemove={() => {
                  setFormData({ ...formData, image: '' });
                }}
                categoryName={formData.name || 'Category'}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload an image to represent this category (optional). If no image is provided, a colorful placeholder will be shown.
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (formErrors.description) {
                    setFormErrors({ ...formErrors, description: undefined });
                  }
                }}
                placeholder="Enter category description (optional)"
                rows={3}
                className={`rounded-md ${formErrors.description ? "border-red-500 focus:ring-red-500" : ""}`}
                maxLength={500}
              />
              {formErrors.description && (
                <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Preview of final slug */}
            {formData.name && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">URL Preview</p>
                    <p className="text-xs text-blue-700 mt-1 break-all">
                      {formData.parentId 
                        ? `/${availableParentCategories.find(c => c.id === formData.parentId)?.slug}/${formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}`
                        : `/${formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setFormErrors({});
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="w-full sm:w-auto min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {selectedCategory ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  selectedCategory ? "Update" : "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Category
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCategory && (
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete the category{" "}
                    <strong>"{selectedCategory.name}"</strong>?
                  </p>

                  {selectedCategory._count.children > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            Cannot delete: This category has {selectedCategory._count.children} subcategory(ies)
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Please delete or move all subcategories first.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCategory._count.children === 0 && selectedCategory._count.products > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-orange-800">
                            Warning: Category has{" "}
                            {selectedCategory._count.products} associated product(s)
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            The category will be soft-deleted and can be restored
                            later. Products will remain but won&apos;t be categorized
                            until restored.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCategory._count.children === 0 && selectedCategory._count.products === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm">Choose deletion type:</p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer p-2 rounded border hover:bg-gray-50">
                          <input
                            type="radio"
                            name="deleteType"
                            value="soft"
                            checked={deleteType === "soft"}
                            onChange={(e) =>
                              setDeleteType(e.target.value as "soft" | "hard")
                            }
                            className="mt-1 accent-orange-600"
                          />
                          <div>
                            <p className="text-sm font-medium">Soft Delete</p>
                            <p className="text-xs text-gray-600">
                              Move to trash (can be restored later)
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer p-2 rounded border hover:bg-gray-50">
                          <input
                            type="radio"
                            name="deleteType"
                            value="hard"
                            checked={deleteType === "hard"}
                            onChange={(e) =>
                              setDeleteType(e.target.value as "soft" | "hard")
                            }
                            className="mt-1 accent-red-600"
                          />
                          <div>
                            <p className="text-sm font-medium">Permanent Delete</p>
                            <p className="text-xs text-gray-600">
                              Remove completely (cannot be undone)
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting || (selectedCategory?._count.children || 0) > 0}
              className={`min-w-[140px] w-full sm:w-auto text-white ${
                deleteType === "hard"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : deleteType === "hard" ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Move to Trash
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Multiple Categories
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-3">
                Are you sure you want to delete <strong>{selectedIds.size} categories</strong>?
              </p>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  All selected categories will be moved to trash and can be restored later.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedIds.size} Categories
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}