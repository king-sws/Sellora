/* eslint-disable react/no-unescaped-entities */
'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, Truck, Shield, Package, ArrowRight, Tag, Percent
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn, formatPrice } from '@/lib/utils'

// Types
interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
}

interface CartSummaryProps {
  cart: {
    items: CartItem[]
    subtotal: number
    totalItems: number
    tax: number
    shipping: number
    total: number
    discount?: number
    discountCode?: string
  }
}

// Shared motion variants
const fadeSlide = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
}

// Trust Badge
const TrustBadge = memo(
  ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
    <motion.div {...fadeSlide} className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span>{text}</span>
    </motion.div>
  )
)
TrustBadge.displayName = 'TrustBadge'

// Summary Row
const SummaryRow = memo(
  ({
    label,
    value,
    icon: Icon,
    highlight = false,
    className,
  }: {
    label: string | React.ReactNode
    value: string | React.ReactNode
    icon?: React.ElementType
    highlight?: boolean
    className?: string
  }) => (
    <motion.div
      {...fadeSlide}
      className={cn(
        'flex justify-between items-center text-sm',
        highlight && 'text-base font-semibold',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span>{label}</span>
      </div>
      <span>{value}</span>
    </motion.div>
  )
)
SummaryRow.displayName = 'SummaryRow'

// Main Cart Summary
export const CartSummary = memo(({ cart }: CartSummaryProps) => {
  const { data: session } = useSession()

  const {
    freeShippingThreshold,
    amountUntilFreeShipping,
    isFreeShipping,
    progressPercentage,
    hasSavings,
    totalSavings,
  } = useMemo(() => {
    const threshold = 50
    const remaining = threshold - cart.subtotal
    const isFree = cart.shipping === 0 || cart.subtotal >= threshold
    const progress = Math.min((cart.subtotal / threshold) * 100, 100)
    const savings = cart.discount ?? 0

    return {
      freeShippingThreshold: threshold,
      amountUntilFreeShipping: Math.max(remaining, 0),
      isFreeShipping: isFree,
      progressPercentage: progress,
      hasSavings: savings > 0,
      totalSavings: savings,
    }
  }, [cart.subtotal, cart.shipping, cart.discount])

  return (
    <Card className="shadow-lg border-2">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Order Summary</h2>
          <Badge variant="secondary" className="font-semibold">
            {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}
          </Badge>
        </div>

        <Separator />

        {/* Free Shipping Notice */}
        <AnimatePresence mode="wait">
          {!isFreeShipping && amountUntilFreeShipping > 0 && (
            <motion.div
              {...fadeSlide}
              className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-start gap-2">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    You're almost there!
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Add{' '}
                    <span className="font-bold">
                      {formatPrice(amountUntilFreeShipping)}
                    </span>{' '}
                    more for FREE shipping
                  </p>
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </motion.div>
          )}

          {isFreeShipping && cart.subtotal >= freeShippingThreshold && (
            <motion.div
              {...fadeSlide}
              className="flex items-center gap-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800"
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  🎉 You've unlocked FREE shipping!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your order qualifies for free delivery
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breakdown */}
        <div className="space-y-3">
          <SummaryRow
            label={`Subtotal (${cart.totalItems} ${
              cart.totalItems === 1 ? 'item' : 'items'
            })`}
            value={formatPrice(cart.subtotal)}
          />

          <AnimatePresence>
            {hasSavings && (
              <motion.div {...fadeSlide}>
                <SummaryRow
                  label={
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      <span>Discount</span>
                      {cart.discountCode && (
                        <Badge variant="secondary" className="text-xs">
                          {cart.discountCode}
                        </Badge>
                      )}
                    </div>
                  }
                  value={
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      -{formatPrice(totalSavings)}
                    </span>
                  }
                  className="text-green-600 dark:text-green-400"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <SummaryRow label="Tax" value={formatPrice(cart.tax)} icon={Tag} />

          <SummaryRow
            label="Shipping"
            icon={Truck}
            value={
              isFreeShipping ? (
                <Badge className="bg-green-500 text-white hover:bg-green-600">
                  FREE
                </Badge>
              ) : (
                formatPrice(cart.shipping)
              )
            }
          />
        </div>

        <Separator />

        {/* Total */}
        <motion.div
          {...fadeSlide}
          className="flex justify-between items-center p-4 bg-primary/5 rounded-lg"
        >
          <span className="text-lg font-semibold">Total</span>
          <div className="text-right">
            <motion.div
              key={cart.total}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-2xl font-semibold text-primary"
            >
              {formatPrice(cart.total)}
            </motion.div>
            {hasSavings && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                You saved {formatPrice(totalSavings)}!
              </p>
            )}
          </div>
        </motion.div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            asChild
            size="lg"
            className="w-full group shadow-lg hover:shadow-xl transition-all"
          >
            <Link
              href={session ? '/checkout' : '/auth/sign-in?callbackUrl=/cart'}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              {session ? 'Proceed to Checkout' : 'Sign In to Checkout'}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>

        <Separator />

        {/* Trust Badges */}
        <div className="space-y-3">
          <TrustBadge icon={Shield} text="Secure checkout guaranteed" />
          <TrustBadge icon={Package} text="30-day hassle-free returns" />
          <TrustBadge icon={Truck} text="Free shipping over $50" />
        </div>

        {/* Payment Methods */}
        {/* <div className="pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground mb-3">
            We accept
          </p>
          <div className="flex justify-center items-center gap-3 flex-wrap">
            {['visa', 'mastercard', 'amex', 'paypal'].map((method) => (
              <div
                key={method}
                className="w-12 h-8 bg-muted rounded border flex items-center justify-center text-xs font-semibold uppercase text-muted-foreground"
              >
                {method.slice(0, 4)}
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </Card>
  )
})

CartSummary.displayName = 'CartSummary'
