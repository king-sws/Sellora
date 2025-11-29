'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Eye, Package, Calendar, CreditCard, Download, Search, ChevronRight, Truck, Clock, MapPin, Phone, Mail, MoreVertical, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  trackingNumber: string | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      images: string[];
      slug: string;
    };
  }>;
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
  SHIPPED: { 
    label: 'Shipped', 
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  DELIVERED: { 
    label: 'Delivered', 
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  CANCELLED: { 
    label: 'Cancelled', 
    color: 'bg-gray-500',
    lightColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  },
  REFUNDED: { 
    label: 'Refunded', 
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
};

const paymentStatusConfig = {
  PENDING: { label: 'Pending', color: 'border-l-amber-400 bg-amber-50' },
  PAID: { label: 'Paid', color: 'border-l-green-400 bg-green-50' },
  FAILED: { label: 'Failed', color: 'border-l-red-400 bg-red-50' },
  REFUNDED: { label: 'Refunded', color: 'border-l-blue-400 bg-blue-50' },
};

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/account/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setTotalPages(data.pagination.pages);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getOrderStatusSteps = (status: string) => {
    const steps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentIndex = steps.indexOf(status);
    
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      return { current: -1, steps };
    }
    
    return { current: currentIndex, steps };
  };

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.items.some(item => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="mb-8 space-y-3">
            <div className="h-9 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-56 bg-gray-100 rounded animate-pulse"></div>
          </div>
          
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 bg-white rounded-lg border border-gray-200">
                <div className="space-y-4">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-24 bg-gray-50 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Clean Header */}
        <div className="mb-8 lg:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
                Orders
              </h1>
              <p className="text-gray-500 text-base">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="h-9 text-sm font-normal border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by order number or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 border-gray-300">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Order Placed</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders found
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              {statusFilter === 'all' 
                ? searchQuery 
                  ? "Try adjusting your search terms"
                  : "When you place orders, they'll appear here"
                : `No ${statusConfig[statusFilter as keyof typeof statusConfig]?.label.toLowerCase()} orders`}
            </p>
            {statusFilter === 'all' && !searchQuery && (
              <Link href="/products">
                <Button className="bg-gray-900 hover:bg-gray-800">
                  Continue shopping
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = statusConfig[order.status as keyof typeof statusConfig];
              const paymentInfo = paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig];
              const { current: currentStep, steps } = getOrderStatusSteps(order.status);
              
              return (
                <div 
                  key={order.id} 
                  className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  {/* Order Header */}
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-base font-semibold text-gray-900">
                            Order #{order.orderNumber}
                          </h3>
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

                          {order.trackingNumber && (
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-4 w-4" />
                              <span className="text-xs font-mono">{order.trackingNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between lg:justify-end gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">Total</div>
                          <div className="text-xl font-semibold text-gray-900">
                            ${order.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  {currentStep >= 0 && (
                    <div className="px-4 sm:px-6 py-5 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between relative">
                        {/* Progress Line */}
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
                          <div 
                            className={`h-full ${statusInfo.color} transition-all duration-500`}
                            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                          ></div>
                        </div>

                        {steps.map((step, index) => {
                          const stepConfig = statusConfig[step as keyof typeof statusConfig];
                          const isCompleted = index < currentStep;
                          const isCurrent = index === currentStep;
                          const isPending = index > currentStep;
                          
                          return (
                            <div key={step} className="flex flex-col items-center z-10 flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${
                                isCurrent
                                  ? `${stepConfig.color} text-white ring-4 ring-opacity-20 ${stepConfig.color.replace('bg-', 'ring-')}`
                                  : isCompleted
                                    ? `${stepConfig.color} text-white`
                                    : 'bg-white border-2 border-gray-300 text-gray-400'
                              }`}>
                                {isCompleted ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <span className="text-xs font-medium">{index + 1}</span>
                                )}
                              </div>
                              <div className={`text-[10px] sm:text-xs text-center font-medium ${
                                isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-500'
                              }`}>
                                <div className="hidden sm:block">{stepConfig.label}</div>
                                <div className="sm:hidden">{stepConfig.label.split(' ')[0]}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3 mb-4">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center gap-4 group">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                            <Image
                              src={item.product.images[0] || '/placeholder.png'}
                              alt={item.product.name}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                              {item.product.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Qty {item.quantity}
                            </p>
                          </div>
                          
                          <div className="text-sm font-medium text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      
                      {order.items.length > 3 && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-sm text-gray-500 text-center">
                            +{order.items.length - 3} more {order.items.length - 3 === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
                      <Link href={`/account/orders/${order.id}`} className="flex-1">
                        <Button 
                          variant="outline" 
                          className="w-full h-10 border-gray-300 hover:bg-gray-50 font-normal"
                        >
                          View details
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </Button>
                      </Link>
                      
                      {order.trackingNumber && (
                        <Button 
                          variant="default" 
                          className="sm:w-auto h-10 bg-gray-900 hover:bg-gray-800 font-normal"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Track package
                        </Button>
                      )}

                      {order.status === 'DELIVERED' && (
                        <Button 
                          variant="outline" 
                          className="sm:w-auto h-10 border-gray-300 hover:bg-gray-50 font-normal"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Buy again
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 pt-8 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3 border-gray-300 disabled:opacity-40"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(7, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                return (
                  <Button
                    key={i}
                    variant={currentPage === pageNum ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 p-0 text-sm ${
                      currentPage === pageNum 
                        ? 'bg-gray-900 text-white hover:bg-gray-800' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-9 px-3 border-gray-300 disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}