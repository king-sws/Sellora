'use client'

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X, Folder, FolderOpen } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface HierarchicalCategorySelectorProps {
  categories: Category[];
  value: string | null;
  onValueChange: (value: string | null) => void;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
  level: number;
}

function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  // Initialize all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
  });

  // Build tree structure
  categories.forEach(cat => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children alphabetically
  const sortChildren = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  const traverse = (nodes: CategoryNode[]) => {
    nodes.forEach(node => {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return result;
}

export default function HierarchicalCategorySelector({
  categories,
  value,
  onValueChange
}: HierarchicalCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  const selectedCategory = categories.find(c => c.id === value);

  // Get full path for a category
  const getCategoryPath = (categoryId: string): string => {
    const path: string[] = [];
    let current = categories.find(c => c.id === categoryId);
    
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
    }
    
    return path.join(' > ');
  };

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!search) return flatCategories;
    
    const searchLower = search.toLowerCase();
    const matchingIds = new Set<string>();
    
    // Find all matching categories and their ancestors
    categories.forEach(cat => {
      if (cat.name.toLowerCase().includes(searchLower)) {
        matchingIds.add(cat.id);
        
        // Add all ancestors
        let parent = categories.find(c => c.id === cat.parentId);
        while (parent) {
          matchingIds.add(parent.id);
          parent = categories.find(c => c.id === parent!.parentId);
        }
      }
    });
    
    return flatCategories.filter(cat => matchingIds.has(cat.id));
  }, [search, flatCategories, categories]);

  // Auto-expand when searching
  React.useEffect(() => {
    if (search) {
      const newExpanded = new Set<string>();
      filteredCategories.forEach(cat => {
        if (cat.parentId) {
          newExpanded.add(cat.parentId);
        }
      });
      setExpandedIds(newExpanded);
    }
  }, [search, filteredCategories]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // ✅ CRITICAL: Prevent form submission
    e.stopPropagation(); // ✅ CRITICAL: Prevent category selection
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // ✅ FIX: Only update the form value, don't close immediately
  const handleSelect = (categoryId: string | null, e?: React.MouseEvent) => {
    // ✅ CRITICAL: Prevent form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Update the form value
    onValueChange(categoryId);
    // Close the dropdown
    setIsOpen(false);
    // Clear search
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(null);
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const renderCategory = (category: CategoryNode) => {
    const isExpanded = expandedIds.has(category.id);
    const isSelected = value === category.id;
    const hasChildren = category.children.length > 0;
    const shouldShow = filteredCategories.some(c => c.id === category.id);

    if (!shouldShow) return null;

    return (
      <div key={category.id}>
        <div
          className={`
            flex items-center gap-2 px-2 py-2 cursor-pointer rounded
            hover:bg-gray-100 transition-colors
            ${isSelected ? 'bg-blue-50 text-blue-700' : ''}
          `}
          style={{ paddingLeft: `${category.level * 20 + 8}px` }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(category.id);
          }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => toggleExpand(category.id, e)}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-5" />}
          
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-gray-500" />
            )
          ) : (
            <div className="h-4 w-4 rounded border border-gray-300 bg-white" />
          )}
          
          <span className="flex-1 text-sm">{category.name}</span>
          
          {isSelected && <Check className="h-4 w-4 text-blue-600" />}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {category.children.map(child => renderCategory(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <div
        className={`
          flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer
          bg-white hover:border-gray-400 transition-colors
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
        `}
        onClick={toggleDropdown}
      >
        <span className={selectedCategory ? 'text-sm' : 'text-sm text-gray-500'}>
          {selectedCategory ? getCategoryPath(selectedCategory.id) : 'Select category'}
        </span>
        
        <div className="flex items-center gap-1">
          {value && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  {search ? 'No categories found' : 'No categories available'}
                </div>
              ) : (
                <>
                  <div
                    className={`
                      flex items-center gap-2 px-2 py-2 cursor-pointer rounded mb-1
                      hover:bg-gray-100 transition-colors
                      ${!value ? 'bg-blue-50 text-blue-700' : ''}
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(null);
                    }}
                  >
                    <div className="w-5" />
                    <X className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 text-sm font-medium">No category</span>
                    {!value && <Check className="h-4 w-4 text-blue-600" />}
                  </div>
                  
                  <div className="border-t border-gray-200 my-2" />
                  
                  {categoryTree.map(category => renderCategory(category))}
                </>
              )}
            </div>

            {selectedCategory && (
              <div className="p-2 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-500">
                  Selected: <span className="font-medium text-gray-700">{getCategoryPath(selectedCategory.id)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}