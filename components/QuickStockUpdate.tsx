/* eslint-disable react/no-unescaped-entities */

// components/QuickStockUpdate.tsx - Modal for quick stock updates
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Zap, Package } from 'lucide-react'

interface QuickStockUpdateProps {
  product: {
    id: string
    name: string
    stock: number
    images: string[]
  }
  isOpen: boolean
  onClose: () => void
  onUpdate: (productId: string, newStock: number) => Promise<void>
}

export default function QuickStockUpdate({ 
  product, 
  isOpen, 
  onClose, 
  onUpdate 
}: QuickStockUpdateProps) {
  const [stock, setStock] = useState(product.stock.toString())
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newStock = parseInt(stock)
    
    if (isNaN(newStock) || newStock < 0) {
      alert('Please enter a valid stock number')
      return
    }

    try {
      setIsUpdating(true)
      await onUpdate(product.id, newStock)
      onClose()
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Stock Update
          </DialogTitle>
          <DialogDescription>
            Update the stock level for "{product.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500">
                  Current stock: {product.stock}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="stock">New Stock Level</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Enter new stock level"
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}