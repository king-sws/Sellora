/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Sparkles, Package, DollarSign, TrendingUp, Clock, Star, X } from "lucide-react"

interface ProductFiltersProps {
  categories: Array<{
    id: string
    name: string
    slug: string
    _count: { products: number }
  }>
  currentCategory?: string
  currentSort?: string
  currentMinPrice?: string
  currentMaxPrice?: string
  featuredCount?: number
  inStockCount?: number
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First", icon: Clock },
  { value: "popular", label: "Most Popular", icon: TrendingUp },
  { value: "price_asc", label: "Price: Low to High", icon: DollarSign },
  { value: "price_desc", label: "Price: High to Low", icon: DollarSign },
  { value: "name_asc", label: "Name: A to Z", icon: Star },
  { value: "name_desc", label: "Name: Z to A", icon: Star },
]

export function ProductFilters({
  categories,
  currentCategory,
  currentSort,
  currentMinPrice,
  currentMaxPrice,
  featuredCount = 0,
  inStockCount = 0,
}: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [minPrice, setMinPrice] = useState(currentMinPrice || "")
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || "")

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page")
    router.push(`/products?${params.toString()}`)
  }

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (minPrice) params.set("min_price", minPrice)
    else params.delete("min_price")
    if (maxPrice) params.set("max_price", maxPrice)
    else params.delete("max_price")
    params.delete("page")
    router.push(`/products?${params.toString()}`)
  }

  const clearPriceFilter = () => {
    setMinPrice("")
    setMaxPrice("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("min_price")
    params.delete("max_price")
    params.delete("page")
    router.push(`/products?${params.toString()}`)
  }

  const currentFeatured = searchParams.get("featured")
  const currentInStock = searchParams.get("in_stock")

  return (
    <div className="space-y-6">
      {/* Sort By */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Sort By</Label>
        <Select
          defaultValue={currentSort || "newest"}
          onValueChange={(value) => updateFilters("sort", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sorting" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    {option.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Category</Label>
        <Select
          defaultValue={currentCategory || "all"}
          onValueChange={(value) =>
            updateFilters("category", value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}{" "}
                <Badge variant="secondary" className="ml-2">
                  {category._count.products}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Quick Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Filters</Label>
        <div className="space-y-2">
          <FilterCheckbox
            checked={currentFeatured === "true"}
            onCheckedChange={() => updateFilters("featured", currentFeatured === "true" ? null : "true")}
            icon={Sparkles}
            label="Featured"
            count={featuredCount}
            iconClassName="text-yellow-500"
          />
          <FilterCheckbox
            checked={currentInStock === "true"}
            onCheckedChange={() => updateFilters("in_stock", currentInStock === "true" ? null : "true")}
            icon={Package}
            label="In Stock"
            count={inStockCount}
            iconClassName="text-green-500"
          />
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Price Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-8"
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={applyPriceFilter} size="sm" className="flex-1">
            Apply
          </Button>
          {(currentMinPrice || currentMaxPrice) && (
            <Button onClick={clearPriceFilter} size="sm" variant="outline">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Reusable compact filter checkbox
function FilterCheckbox({
  checked,
  onCheckedChange,
  icon: Icon,
  label,
  count,
  iconClassName,
}: {
  checked: boolean
  onCheckedChange: () => void
  icon: any
  label: string
  count?: number
  iconClassName?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <div className="flex items-center gap-2 text-sm">
        <Icon className={cn("w-4 h-4", iconClassName)} />
        {label}
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="text-xs ml-1">
            {count}
          </Badge>
        )}
      </div>
    </div>
  )
}
