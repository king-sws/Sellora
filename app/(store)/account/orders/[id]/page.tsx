'use client'
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, MapPin, CreditCard, Calendar, Truck, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

interface OrderDetail {
  id: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      images: string[];
      slug: string;
      price: number;
    };
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  } | null;
}

const statusConfig = {
  PENDING: { label: 'Order Pending', color: 'bg-yellow-100 text-yellow-800', icon: '⏳', description: 'Your order is being reviewed' },
  CONFIRMED: { label: 'Order Confirmed', color: 'bg-blue-100 text-blue-800', icon: '✅', description: 'Your order has been confirmed and will be processed soon' },
  PROCESSING: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: '🔄', description: 'Your order is being prepared for shipment' },
  SHIPPED: { label: 'Shipped', color: 'bg-orange-100 text-orange-800', icon: '🚚', description: 'Your order is on its way' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: '📦', description: 'Your order has been delivered' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌', description: 'This order has been cancelled' },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800', icon: '💰', description: 'This order has been refunded' },
};

const paymentStatusConfig = {
  PENDING: { label: 'Payment Pending', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Payment Failed', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/account/orders/${params.id}`);
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
      } else if (response.status === 404) {
        router.push('/account/orders');
      } else {
        console.error('Failed to fetch order');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    // Replaced confirm() with a simple check to proceed with the cancellation.
    if (!order) return;

    setMessage(null);
    setCancelling(true);

    try {
      const response = await fetch(`/api/account/orders/${order.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrder(updatedOrder);
        setMessage({ type: 'success', text: 'Order cancelled successfully.' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to cancel order.' });
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      setMessage({ type: 'error', text: 'Failed to cancel order.' });
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canCancelOrder = (status: string) => {
    return ['PENDING', 'CONFIRMED'].includes(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order not found</h2>
          <Link href="/account/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status as keyof typeof statusConfig];
  const paymentInfo = paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/account/orders">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <Badge className={statusInfo.color}>
                {statusInfo.icon} {statusInfo.label}
              </Badge>
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(order.total)}
              </div>
            </div>
          </div>

          {/* Status Description */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{statusInfo.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{statusInfo.label}</h3>
                  <p className="text-gray-600 text-sm">{statusInfo.description}</p>
                </div>
              </div>
              {order.trackingNumber && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Tracking Number:</span>
                    <span className="font-mono text-blue-700">{order.trackingNumber}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message for cancellation success/error */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={item.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                          {/* Using Next.js Image component for optimization */}
                          <Image
                            src={item.product.images[0] || 'https://placehold.co/64x64/E2E8F0/64748B?text=No+Image'}
                            alt={item.product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            <Link href={`/products/${item.product.slug}`} className="hover:underline">
                              {item.product.name}
                            </Link>
                          </h4>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Order Summary */}
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <div className="space-y-2 text-right text-sm">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Shipping:</span>
                      <span>{formatPrice(order.shipping)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Tax:</span>
                      <span>{formatPrice(order.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Order Total:</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Cancel Order Button */}
            {canCancelOrder(order.status) && (
              <Button
                onClick={handleCancelOrder}
                variant="destructive"
                className="w-full"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.shippingAddress ? (
                  <address className="not-italic text-sm text-gray-700 space-y-1">
                    <p className="font-semibold">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                    {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                    <p>{order.shippingAddress.address1}</p>
                    {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                    <p>{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <div className="flex items-center gap-1 mt-2">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span>{order.shippingAddress.phone}</span>
                      </div>
                    )}
                  </address>
                ) : (
                  <p className="text-gray-500 text-sm">No shipping address provided.</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge className={paymentInfo.color}>{paymentInfo.label}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Provider:</span>
                  <span className="font-medium text-gray-900">{order.paymentProvider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-medium text-gray-900">{formatDate(order.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
