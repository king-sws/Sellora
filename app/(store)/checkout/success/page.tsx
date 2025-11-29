/* eslint-disable react/no-unescaped-entities */
// app/(store)/checkout/success/page.tsx - Redesigned Success Page
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Package, Truck, Mail, ArrowRight, Eye, MapPin, CreditCard, Calendar, Clock } from 'lucide-react'

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images: string[];
  };
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  user?: {
    email: string;
  };
}

const statusConfig = {
  PENDING: { 
    label: 'Order Placed', 
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  CONFIRMED: { 
    label: 'Confirmed', 
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  PROCESSING: { 
    label: 'Processing', 
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
};

const paymentStatusConfig = {
  PENDING: { label: 'Pending', color: 'border-l-amber-400 bg-amber-50' },
  PAID: { label: 'Paid', color: 'border-l-green-400 bg-green-50' },
  FAILED: { label: 'Failed', color: 'border-l-red-400 bg-red-50' },
};

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="space-y-6">
            <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-500 text-sm mb-6">
            We couldn't locate your order details. Please check your email for order confirmation.
          </p>
          <Link href="/">
            <button className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
              Return Home
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[order.status as keyof typeof statusConfig];
  const paymentInfo = paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Thank you for your purchase. We've received your order and will begin processing it shortly.
          </p>
          {order.user?.email && (
            <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-1.5">
              <Mail className="h-4 w-4" />
              Confirmation sent to {order.user.email}
            </p>
          )}
        </div>

        {/* Order Summary Card */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden">
          {/* Order Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-content-emphasis min-w-0 text-lg font-semibold leading-7">
                    Order #{order.orderNumber}
                  </h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.lightColor} ${statusInfo.textColor}`}>
                    {statusInfo.label}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded border-l-2 ${paymentInfo.color}`}>
                    <CreditCard className="h-4 w-4" />
                    <span className="text-xs font-medium">{paymentInfo.label}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Total</div>
                <div className="text-xl font-semibold text-gray-900">
                  {formatPrice(order.total)}
                </div>
              </div>
            </div>
          </div>

          {/* Order Progress */}
          <div className="px-4 sm:px-6 py-6 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">What happens next?</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Order Confirmed</h4>
                  <p className="text-sm text-gray-500">
                    Your order has been received and is being prepared for processing.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Processing</h4>
                  <p className="text-sm text-gray-500">
                    We'll process and prepare your items for shipment within 1-2 business days.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Shipped</h4>
                  <p className="text-sm text-gray-500">
                    You'll receive a tracking number once your order ships. Estimated delivery: 3-5 business days.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-4 sm:p-6">
            <h3 className="text-content-emphasis min-w-0 text-lg font-semibold leading-7 mb-4">Order Items</h3>
            <div className="space-y-3 mb-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 group">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                    {item.product.images[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                      {item.product.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Qty {item.quantity}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPrice(item.price)} each
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="pt-4 border-t border-gray-100">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal || order.total)}</span>
                </div>
                {order.shipping > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span>{formatPrice(order.shipping)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-gray-400" />
                <h3 className="text-content-emphasis min-w-0 text-lg font-semibold leading-7">Shipping Address</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1 leading-relaxed">
                <div className="font-medium text-gray-900">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </div>
                <div>{order.shippingAddress.address1}</div>
                {order.shippingAddress.address2 && (
                  <div>{order.shippingAddress.address2}</div>
                )}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </div>
                <div>{order.shippingAddress.country}</div>
                {order.shippingAddress.phone && (
                  <div className="pt-2 text-gray-500">
                    {order.shippingAddress.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <h3 className="text-content-emphasis min-w-0 text-lg font-semibold leading-7">Payment Method</h3>
            </div>
            <div className="space-y-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {order.paymentStatus}
              </span>
              <p className="text-sm text-gray-600">
                Your payment has been {order.paymentStatus === 'PAID' ? 'successfully processed' : 'received and is being processed'}.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link href="/account/orders" className="flex-1">
            <button className="group flex h-10 w-full text-white items-center justify-center gap-2 whitespace-nowrap  rounded-md border px-4 text-sm transition-all border-black bg-black dark:bg-white dark:border-white text-content-inverted hover:bg-inverted hover:ring-4 hover:ring-border-subtle xs:w-fit">
              <Eye className="h-4 w-4" />
              <p className='min-w-0 truncate'>View Order History</p>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </button>
          </Link>
          <Link href="/products" className="flex-1">
            <button className="w-full h-10 px-6 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-lg transition-colors">
              Continue Shopping
            </button>
          </Link>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Need help with your order?</h3>
          <p className="text-sm text-blue-800 mb-3">
            Our customer support team is here to assist you with any questions or concerns.
          </p>
          <Link href="/contact">
            <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              Contact Support →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}