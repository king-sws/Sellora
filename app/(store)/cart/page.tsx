// app/(store)/cart/page.tsx
'use client'

import { useCart } from '@/hooks/use-cart'
import { CartItem } from '@/components/store/cart-item'
import { CartSummary } from '@/components/store/cart-summary'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ShoppingBag, ArrowLeft, Package, Shield, Truck } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { memo, useMemo, useState, useCallback } from 'react'

// Memoized Loading Skeleton Component
const CartLoadingSkeleton = memo(() => (
  <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-8" />
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex gap-4 sm:gap-6">
                <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3 min-w-0">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <Card className="p-6 lg:sticky lg:top-8">
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-12 w-full mt-6" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
))
CartLoadingSkeleton.displayName = 'CartLoadingSkeleton'

// Memoized Empty State Component with Smart Image Detection
const EmptyCartState = memo(() => {
  const [imageStyle, setImageStyle] = useState<'contain' | 'cover'>('contain')
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      setImageLoaded(true)
      return
    }

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    try {
      ctx.drawImage(img, 0, 0)
      
      // Check corners and edges for transparency or pure white
      const checkPoints = [
        { x: 0, y: 0 }, // top-left
        { x: canvas.width - 1, y: 0 }, // top-right
        { x: 0, y: canvas.height - 1 }, // bottom-left
        { x: canvas.width - 1, y: canvas.height - 1 }, // bottom-right
        { x: Math.floor(canvas.width / 2), y: 0 }, // top-center
        { x: 0, y: Math.floor(canvas.height / 2) }, // left-center
      ]

      let hasTransparency = false
      let pureWhiteCorners = 0

      for (const point of checkPoints) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data
        
        // Check for transparency
        if (pixel[3] < 255) {
          hasTransparency = true
          break
        }
        
        // Check for pure white or near-white (common in product photos without background)
        if (pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250) {
          pureWhiteCorners++
        }
      }

      // If image has transparency or mostly white corners, use contain with padding
      if (hasTransparency || pureWhiteCorners >= 4) {
        setImageStyle('contain')
      } else {
        setImageStyle('cover')
      }
    } catch (err) {
      // If CORS error, default to contain (safer for empty state illustrations)
      console.log('Could not analyze image, using contain')
      setImageStyle('contain')
    }
    
    setImageLoaded(true)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center p-4"
    >
      <Card className="max-w-lg w-full p-8 sm:p-12 text-center shadow-2xl border-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6"
        >
          <Image
            src="/hippo-empty-cart.png"
            fill
            alt="Empty shopping cart"
            className={imageStyle === 'contain' ? 'object-contain p-4' : 'object-cover'}
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            onLoad={handleImageLoad}
            priority
          />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-bold mb-2"
        >
          Your cart is empty
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8 text-sm sm:text-base"
        >
          Discover amazing products and start shopping today!
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button asChild size="lg" className="w-full group">
            <Link href="/products">
              <Package className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Start Shopping
            </Link>
          </Button>
        </motion.div>
      </Card>
    </motion.div>
  )
})
EmptyCartState.displayName = 'EmptyCartState'

// Memoized Sign In Prompt Component
const SignInPrompt = memo(() => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center p-4"
  >
    <Card className="max-w-md w-full p-8 text-center shadow-2xl border-2">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4"
      >
        <ShoppingBag className="w-8 h-8 text-primary" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold mb-2"
      >
        Sign in to view your cart
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mb-6"
      >
        Create an account or sign in to save your cart and checkout.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/auth/sign-in?callbackUrl=/cart">
            Sign In
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/products">
            Continue Shopping
          </Link>
        </Button>
      </motion.div>
    </Card>
  </motion.div>
))
SignInPrompt.displayName = 'SignInPrompt'

// Trust Badge Component
const TrustBadge = memo(({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3"
  >
    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground">{text}</p>
  </motion.div>
))
TrustBadge.displayName = 'TrustBadge'

export default function CartPage() {
  const { data: session, status } = useSession()
  const { cart, loading } = useCart()

  // Memoize computed values for performance
  const hasItems = useMemo(() => cart?.items?.length > 0, [cart?.items?.length])
  const itemCount = useMemo(() => cart?.totalItems || cart?.items?.length || 0, [cart?.totalItems, cart?.items?.length])

  // Show loading state while checking authentication
  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return <CartLoadingSkeleton />
  }

  // Not authenticated
  if (!session) {
    return <SignInPrompt />
  }

  // Empty cart
  if (!hasItems) {
    return <EmptyCartState />
  }

  // Cart with items
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Shopping Cart</h1>
            <p className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Button variant="outline" asChild className="group w-full sm:w-auto shadow-sm">
            <Link href="/products">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Continue Shopping
            </Link>
          </Button>
        </motion.div>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8"
          >
            <Card className="shadow-lg overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base sm:text-lg font-medium">
                  Items in Cart ({itemCount})
                </h2>
              </div>
              <div>
                <AnimatePresence mode="popLayout">
                  {cart.items.map((item) => (
                    <CartItem 
                      key={item.id} 
                      item={item}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </Card>

            {/* Mobile Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 lg:hidden space-y-3"
            >
              <TrustBadge icon={Shield} text="Secure payment processing" />
              <TrustBadge icon={Truck} text="Free shipping over $50" />
              <TrustBadge icon={Package} text="30-day return policy" />
            </motion.div>
          </motion.div>

          {/* Cart Summary - Sticky on desktop */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 mt-8 lg:mt-0"
          >
            <div className="lg:sticky lg:top-8 space-y-4">
              <CartSummary cart={cart} />
              
              {/* Desktop Trust Badges */}
              {/* <Card className="p-4 sm:p-6 hidden lg:block shadow-lg">
                <h3 className="font-semibold mb-4 text-sm">Why shop with us?</h3>
                <div className="space-y-3">
                  <TrustBadge icon={Shield} text="Secure payment processing" />
                  <TrustBadge icon={Truck} text="Free shipping over $50" />
                  <TrustBadge icon={Package} text="30-day return policy" />
                </div>
              </Card> */}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}