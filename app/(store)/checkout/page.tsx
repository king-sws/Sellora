/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/checkout/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCart } from '@/hooks/use-cart'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { CheckoutSummary } from '@/components/store/checkout-summary'
import { ShoppingBag, MapPin, CreditCard, Truck, AlertCircle, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const checkoutSchema = z.object({
  shippingAddressId: z.string().optional(),
  notes: z.string().optional(),
  useNewAddress: z.boolean(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  saveAddress: z.boolean().optional()
}).superRefine((data, ctx) => {
  if (data.useNewAddress) {
    if (!data.firstName?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "First name is required", path: ["firstName"] })
    if (!data.lastName?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Last name is required", path: ["lastName"] })
    if (!data.address1?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address is required", path: ["address1"] })
    if (!data.city?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required", path: ["city"] })
    if (!data.state?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required", path: ["state"] })
    if (!data.zipCode?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ZIP code is required", path: ["zipCode"] })
    if (!data.country?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Country is required", path: ["country"] })
  } else {
    if (!data.shippingAddressId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a shipping address", path: ["shippingAddressId"] })
    }
  }
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

interface AppliedCoupon {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  description?: string
  discount: number
}

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { cart, loading: cartLoading, clearCart } = useCart()
  const [addresses, setAddresses] = useState<any[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null)
  const [savingAddressId, setSavingAddressId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<CheckoutFormData | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      useNewAddress: false,
      country: 'United States',
      saveAddress: false
    }
  })

  const useNewAddress = watch('useNewAddress')
  const selectedAddressId = watch('shippingAddressId')
  const saveAddress = watch('saveAddress')

  // Calculate totals with coupon discount
  const calculateTotals = () => {
    const subtotal = cart?.subtotal || 0
    const tax = cart?.tax || 0
    const shipping = cart?.shipping || 0
    const discount = appliedCoupon?.discount || 0
    const total = Math.max(0, subtotal + tax + shipping - discount)

    return { subtotal, tax, shipping, discount, total }
  }

  const totals = calculateTotals()

  // Handle authentication redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/sign-in?callbackUrl=/checkout')
    }
  }, [status, router])

  // Fetch addresses when user is authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses()
    }
  }, [status])

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses')
      if (response.ok) {
        const data = await response.json()
        setAddresses(data)
        
        const defaultAddress = data.find((addr: any) => addr.isDefault)
        if (defaultAddress && !useNewAddress) {
          setValue('shippingAddressId', defaultAddress.id)
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
      setError('Failed to load addresses. Please refresh the page.')
    } finally {
      setAddressesLoading(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    try {
      setSavingAddressId(addressId)
      const response = await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete address')
      }

      await fetchAddresses()
      setDeletingAddressId(null)
      
      // If deleted address was selected, clear selection
      if (selectedAddressId === addressId) {
        setValue('shippingAddressId', '')
      }

      toast.success('Address deleted successfully')
    } catch (error) {
      console.error('Error deleting address:', error)
      toast.error('Failed to delete address')
    } finally {
      setSavingAddressId(null)
    }
  }

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      setSavingAddressId(addressId)
      const response = await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PATCH'
      })

      if (!response.ok) {
        throw new Error('Failed to set default address')
      }

      await fetchAddresses()
      toast.success('Default address updated successfully')
    } catch (error) {
      console.error('Error setting default address:', error)
      toast.error('Failed to set default address')
    } finally {
      setSavingAddressId(null)
    }
  }

  const handleCouponApplied = (coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon)
    setError(null)
  }

  const handleCouponRemoved = () => {
    setAppliedCoupon(null)
  }

  const createAddressAndOrder = async (data: CheckoutFormData, shouldSaveAddress: boolean) => {
    let shippingAddressId = data.shippingAddressId

    if (data.useNewAddress) {
      if (shouldSaveAddress) {
        // Check for EXACT duplicate (including address2)
        const exactDuplicate = addresses.find(addr =>
          addr.firstName?.toLowerCase() === data.firstName?.toLowerCase() &&
          addr.lastName?.toLowerCase() === data.lastName?.toLowerCase() &&
          addr.address1?.toLowerCase() === data.address1?.toLowerCase() &&
          (addr.address2 || '').toLowerCase() === (data.address2 || '').toLowerCase() &&
          addr.city?.toLowerCase() === data.city?.toLowerCase() &&
          addr.state?.toLowerCase() === data.state?.toLowerCase() &&
          addr.zipCode === data.zipCode &&
          addr.country?.toLowerCase() === data.country?.toLowerCase()
        )

        if (exactDuplicate) {
          // Use existing exact duplicate
          shippingAddressId = exactDuplicate.id
        } else {
          // Create new saved address
          const addressResponse = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: data.firstName,
              lastName: data.lastName,
              address1: data.address1,
              address2: data.address2 || '',
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              country: data.country,
              phone: data.phone || '',
              isDefault: addresses.length === 0
            })
          })

          if (!addressResponse.ok) {
            const errorData = await addressResponse.json()
            throw new Error(errorData.error || 'Failed to create shipping address')
          }

          const newAddress = await addressResponse.json()
          shippingAddressId = newAddress.id
        }
      } else {
        // Create temporary address (not saved)
        const tempAddressResponse = await fetch('/api/addresses/temporary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            address1: data.address1,
            address2: data.address2 || '',
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country,
            phone: data.phone || ''
          })
        })

        if (!tempAddressResponse.ok) {
          throw new Error('Failed to process shipping address')
        }

        const tempAddress = await tempAddressResponse.json()
        shippingAddressId = tempAddress.id
      }
    }

    if (!shippingAddressId) {
      setError('Please select or create a shipping address')
      return
    }

    // Create order with coupon
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingAddressId,
        notes: data.notes || undefined,
        priority: 'NORMAL',
        source: 'WEBSITE',
        couponId: appliedCoupon?.id || undefined,
        couponCode: appliedCoupon?.code || undefined
      })
    })

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json()
      throw new Error(errorData.error || 'Failed to create order')
    }

    const order = await orderResponse.json()
    
    await clearCart()
    router.push(`/checkout/success?order=${order.id}`)
  }

  const onSubmit = async (data: CheckoutFormData) => {
    // If using new address, show confirmation dialog
    if (data.useNewAddress && !data.saveAddress) {
      setPendingFormData(data)
      setShowConfirmDialog(true)
      return
    }

    // Otherwise proceed directly
    setSubmitting(true)
    setError(null)
    
    try {
      await createAddressAndOrder(data, data.saveAddress || false)
    } catch (error) {
      console.error('Checkout error:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmCheckout = async (shouldSave: boolean) => {
    if (!pendingFormData) return

    setSubmitting(true)
    setError(null)
    setShowConfirmDialog(false)
    
    try {
      await createAddressAndOrder(pendingFormData, shouldSave)
    } catch (error) {
      console.error('Checkout error:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
      setPendingFormData(null)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }

  if (cartLoading || addressesLoading || !cart) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-gray-700">Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (!cart.items || cart.items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center text-blue-600">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 bg-blue-600 text-white flex items-center justify-center mr-3">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="font-medium">Shipping</span>
            </div>
            <div className="flex items-center text-gray-400">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="font-medium">Payment</span>
            </div>
            <div className="flex items-center text-gray-400">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-medium">Review</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 flex items-center space-x-2">
                    <Checkbox
                      id="useNewAddress"
                      checked={useNewAddress}
                      onCheckedChange={(checked) => setValue('useNewAddress', checked as boolean)}
                    />
                    <label
                      htmlFor="useNewAddress"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Use a new shipping address
                    </label>
                  </div>

                  {useNewAddress ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            {...register('firstName')}
                            className={errors.firstName ? 'border-red-500' : ''}
                          />
                          {errors.firstName && (
                            <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            {...register('lastName')}
                            className={errors.lastName ? 'border-red-500' : ''}
                          />
                          {errors.lastName && (
                            <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address1">Address *</Label>
                        <Input
                          id="address1"
                          {...register('address1')}
                          placeholder="Street address"
                          className={errors.address1 ? 'border-red-500' : ''}
                        />
                        {errors.address1 && (
                          <p className="text-red-500 text-sm mt-1">{errors.address1.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address2">Apartment, suite, etc. (Optional)</Label>
                        <Input
                          id="address2"
                          {...register('address2')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            {...register('city')}
                            className={errors.city ? 'border-red-500' : ''}
                          />
                          {errors.city && (
                            <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            {...register('state')}
                            className={errors.state ? 'border-red-500' : ''}
                          />
                          {errors.state && (
                            <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">ZIP Code *</Label>
                          <Input
                            id="zipCode"
                            {...register('zipCode')}
                            className={errors.zipCode ? 'border-red-500' : ''}
                          />
                          {errors.zipCode && (
                            <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            {...register('country')}
                            className={errors.country ? 'border-red-500' : ''}
                          />
                          {errors.country && (
                            <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          {...register('phone')}
                          type="tel"
                        />
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="saveAddress"
                            checked={saveAddress}
                            onCheckedChange={(checked) => setValue('saveAddress', checked as boolean)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor="saveAddress"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer block"
                            >
                              Save this address to my account
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              You can use it for future orders
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-4">No saved addresses</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setValue('useNewAddress', true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Address
                          </Button>
                        </div>
                      ) : (
                        <RadioGroup
                          value={selectedAddressId}
                          onValueChange={(value) => setValue('shippingAddressId', value)}
                        >
                          <div className="space-y-3">
                            {addresses.map((address) => (
                              <div
                                key={address.id}
                                className={`border rounded-lg p-4 relative transition-all ${
                                  selectedAddressId === address.id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start">
                                  <RadioGroupItem
                                    value={address.id}
                                    id={address.id}
                                    className="mt-1"
                                  />
                                  <div className="ml-3 flex-1">
                                    <label htmlFor={address.id} className="cursor-pointer">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium">
                                          {address.firstName} {address.lastName}
                                        </p>
                                        {address.isDefault && (
                                          <Badge variant="secondary" className="text-xs">Default</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {address.address1}
                                        {address.address2 && `, ${address.address2}`}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {address.city}, {address.state} {address.zipCode}
                                      </p>
                                      <p className="text-sm text-gray-600">{address.country}</p>
                                      {address.phone && (
                                        <p className="text-sm text-gray-600">{address.phone}</p>
                                      )}
                                    </label>
                                    <div className="flex gap-2 mt-3">
                                      {!address.isDefault && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleSetDefaultAddress(address.id)}
                                          disabled={savingAddressId === address.id}
                                        >
                                          <Save className="w-3 h-3 mr-1" />
                                          Set as Default
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingAddressId(address.id)}
                                        disabled={savingAddressId === address.id}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      )}
                      {errors.shippingAddressId && (
                        <p className="text-red-500 text-sm mt-2">{errors.shippingAddressId.message}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-6 space-y-2">
                    <Label htmlFor="notes">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      rows={3}
                      placeholder="Special delivery instructions..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Payment Processing Coming Soon</strong>
                      <p className="mt-1 text-sm">
                        For now, orders will be created as "Payment Pending". 
                        Payment integration will be added in the next phase.
                      </p>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <CheckoutSummary 
                cart={cart} 
                submitting={submitting}
                appliedCoupon={appliedCoupon}
                totals={totals}
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for New Address */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this address?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <span className="block">Would you like to save this shipping address to your account for future orders?</span>
                {pendingFormData && (
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <div className="font-medium text-gray-900">
                      {pendingFormData.firstName} {pendingFormData.lastName}
                    </div>
                    <div className="text-gray-600">{pendingFormData.address1}</div>
                    {pendingFormData.address2 && (
                      <div className="text-gray-600">{pendingFormData.address2}</div>
                    )}
                    <div className="text-gray-600">
                      {pendingFormData.city}, {pendingFormData.state} {pendingFormData.zipCode}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={(e) => {
                e.preventDefault()
                handleConfirmCheckout(false)
              }}
            >
              No, use once
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmCheckout(true)}>
              Yes, save address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      

      {/* Delete Address Confirmation Dialog */}
      <AlertDialog open={!!deletingAddressId} onOpenChange={() => setDeletingAddressId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAddressId && handleDeleteAddress(deletingAddressId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}