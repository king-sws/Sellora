// app/(store)/account/page.tsx - Customer Account Dashboard (True Perplexity Style)
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, User, Settings, Eye, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    product: {
      name: string;
      images: string[];
    };
  }>;
}

interface Address {
  id: string;
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
  isDefault: boolean;
}

const statusConfig = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PROCESSING: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  SHIPPED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  REFUNDED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const paymentStatusConfig = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  REFUNDED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/sign-in');
    }
    if (status === 'authenticated') {
      fetchAccountData();
    }
  }, [status]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const [ordersRes, addressesRes] = await Promise.all([
        fetch('/api/orders?limit=5'),
        fetch('/api/addresses')
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders);
      }

      if (addressesRes.ok) {
        const addressesData = await addressesRes.json();
        setAddresses(addressesData);
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-[#333] animate-spin"></div>
          </div>
          <p className="text-sm text-[#191919]">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const defaultAddress = addresses.find(addr => addr.isDefault);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Section */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl text-content-emphasis min-w-0  font-semibold leading-7 text-[#333] mb-2">
                My Account
              </h1>
              <p className="text-[#191919]">
                Manage your orders, addresses and account settings.
              </p>
            </div>
            <Link href="/account/settings">
              <Button 
                variant="outline" 
                className="gap-2 border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] text-[#333] transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-[#F0F0F0]">
                <Package className="h-6 w-6 text-[#333]" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-[#333]">{orders.length}</div>
                <div className="text-sm text-[#191919]">Total orders</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-[#F0F0F0]">
                <MapPin className="h-6 w-6 text-[#333]" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-[#333]">{addresses.length}</div>
                <div className="text-sm text-[#191919]">Saved addresses</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-[#F0F0F0]">
                <User className="h-6 w-6 text-[#333]" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-[#333] capitalize">
                  {session.user?.role?.toLowerCase() || 'User'}
                </div>
                <div className="text-sm text-[#191919]">Account type</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#333] mb-1">
                Profile Information
              </h2>
              <p className="text-[#191919]">
                Your basic account details and contact information.
              </p>
            </div>
            <Link href="/account/settings?tab=profile">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-[#333] hover:bg-[#F5F5F5]"
              >
                Edit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5E5E5]">
            <div>
              <div className="text-sm text-[#666] mb-2">Full name</div>
              <div className="text-base text-[#191919] font-medium">
                {session.user?.name || 'Not set'}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#666] mb-2">Email address</div>
              <div className="text-base text-[#191919] font-medium">
                {session.user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#333] mb-1">
                Recent Orders
              </h2>
              <p className="text-[#191919]">
                View and track your order history.
              </p>
            </div>
            {orders.length > 0 && (
              <Link href="/account/orders">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-[#333] hover:bg-[#F5F5F5]"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="py-12 text-center border-t border-[#E5E5E5]">
              <div className="inline-flex p-4 rounded-full bg-[#F0F0F0] mb-4">
                <ShoppingBag className="h-8 w-8 text-[#666]" />
              </div>
              <h3 className="text-lg font-semibold text-[#333] mb-2">No orders yet</h3>
              <p className="text-[#191919] mb-6 max-w-md mx-auto">
                Start shopping to see your order history here.
              </p>
              <Link href="/products">
                <Button className="bg-[#333] hover:bg-[#191919] text-white">
                  Browse products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-[#E5E5E5]">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="p-5 rounded-lg border border-[#E5E5E5] hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-[#333] text-lg mb-1">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-[#666]">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${statusConfig[order.status as keyof typeof statusConfig]?.bg} ${statusConfig[order.status as keyof typeof statusConfig]?.text} ${statusConfig[order.status as keyof typeof statusConfig]?.border} border font-medium px-3 py-1`}
                        variant="outline"
                      >
                        {order.status}
                      </Badge>
                      <Badge 
                        className={`${paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.bg} ${paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.text} ${paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.border} border font-medium px-3 py-1`}
                        variant="outline"
                      >
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-[#E5E5E5]">
                    <div>
                      <div className="text-sm text-[#666] mb-2">Order items</div>
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, index) => (
                          <div key={index} className="text-sm text-[#191919]">
                            {item.quantity}× {item.product.name}
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-sm text-[#666]">
                            +{order.items.length - 2} more items
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-[#666] mb-1">Total amount</div>
                        <div className="text-2xl font-semibold text-[#333]">
                          ${order.total.toFixed(2)}
                        </div>
                      </div>
                      
                      <Link href={`/account/orders/${order.id}`}>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] text-[#333]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#333] mb-1">
                Default Shipping Address
              </h2>
              <p className="text-[#191919]">
                Your primary delivery address for orders.
              </p>
            </div>
            <Link href="/account/settings?tab=addresses">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-[#333] hover:bg-[#F5F5F5]"
              >
                Manage
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {defaultAddress ? (
            <div className="p-5 rounded-lg border border-[#E5E5E5] mt-4">
              <h3 className="font-semibold text-[#333] mb-3">
                {defaultAddress.firstName} {defaultAddress.lastName}
              </h3>
              <div className="text-sm text-[#191919] space-y-1 leading-relaxed">
                {defaultAddress.company && <div>{defaultAddress.company}</div>}
                <div>{defaultAddress.address1}</div>
                {defaultAddress.address2 && <div>{defaultAddress.address2}</div>}
                <div>
                  {defaultAddress.city}, {defaultAddress.state} {defaultAddress.zipCode}
                </div>
                <div>{defaultAddress.country}</div>
                {defaultAddress.phone && <div className="pt-2 text-[#666]">Phone: {defaultAddress.phone}</div>}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border-t border-[#E5E5E5] mt-4">
              <div className="inline-flex p-4 rounded-full bg-[#F0F0F0] mb-4">
                <MapPin className="h-8 w-8 text-[#666]" />
              </div>
              <h3 className="text-lg font-semibold text-[#333] mb-2">No default address</h3>
              <p className="text-[#191919] mb-6 max-w-md mx-auto">
                Add a shipping address to make checkout faster.
              </p>
              <Link href="/account/settings?tab=addresses">
                <Button className="bg-[#333] hover:bg-[#191919] text-white">
                  Add address
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}