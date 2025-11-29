// app/(dashboard)/products/[id]/inventory/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  RotateCcw,
  Settings,
  Clock,
  FileText,
  Search,
  Download,
  RefreshCw,
  Calendar,
  Layers
} from 'lucide-react';

/* eslint-disable react/no-unescaped-entities */

// --- 1. TYPE DEFINITIONS ---

type InventoryReason = 
  | 'SALE' 
  | 'RETURN' 
  | 'ADJUSTMENT_MANUAL' 
  | 'RECEIVING' 
  | 'CANCELLATION' 
  | 'OTHER'; 

interface UserData {
  id: string;
  name: string;
  image?: string | null;
}

interface VariantData {
  id: string;
  name: string;
}

interface InventoryLog {
  id: string;
  productId: string;
  variantId?: string | null;
  reason: InventoryReason;
  changeAmount: number;
  newStock: number;
  createdAt: string; // ISO date string
  notes?: string | null;
  changedByUser?: UserData | null;
  referenceId?: string | null;
  variant?: VariantData | null;
}

interface ProductData {
    id: string;
    name: string;
    stock: number; // Assuming product has a current stock field
    // Add other product fields as necessary
}

interface PaginationData {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface ApiResponse {
  logs: InventoryLog[];
  pagination: PaginationData;
}

// Next.js App Router Props structure for a dynamic segment [id]
interface ProductInventoryLogsPageProps {
  params: {
    id: string; // The product ID is taken from the URL
  };
}

// --- 2. COMPONENT LOGIC ---

const ProductInventoryLogsPage: React.FC<ProductInventoryLogsPageProps> = ({ params }) => {
  const productId = params.id;
  
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterReason, setFilterReason] = useState<InventoryReason | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  // Function to fetch product details
  const fetchProduct = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data: ProductData = await response.json();
        setProduct(data);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  }, [productId]);

  // Function to fetch filtered inventory logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Reset page to 1 if any filter or search term changes
      if (page !== 1 && (filterReason !== 'all' || searchTerm || dateFrom || dateTo)) {
        setPage(1);
        return;
      }
      
      const params = new URLSearchParams({
        productId: productId, // Important: Send product ID to API for server-side filtering
        page: page.toString(),
        limit: '50'
      });

      if (filterReason && filterReason !== 'all') {
        params.append('reason', filterReason);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      // NOTE: Assuming API is updated to handle productId and filtering logic
      const response = await fetch(`/api/admin/inventory/logs?${params.toString()}`);
      
      if (response.ok) {
        const data: ApiResponse = await response.json();
        
        // Since we are sending productId to the API, we can assume the server-side
        // filtering is correct and we don't need client-side filtering.
        setLogs(data.logs); 
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, filterReason, searchTerm, dateFrom, dateTo, page]);

  // Fetch product data on mount
  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Fetch logs whenever filtering/pagination dependencies change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Helper functions with typed arguments and returns
  const getReasonIcon = (reason: InventoryReason): React.ReactElement => {
    switch (reason) {
      case 'SALE': return <ShoppingCart className="h-4 w-4" />;
      case 'RETURN': return <RotateCcw className="h-4 w-4" />;
      case 'ADJUSTMENT_MANUAL': return <Settings className="h-4 w-4" />;
      case 'RECEIVING': return <Package className="h-4 w-4" />;
      case 'CANCELLATION': return <RotateCcw className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getReasonColor = (reason: InventoryReason): string => {
    switch (reason) {
      case 'SALE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'RETURN': return 'bg-green-100 text-green-800 border-green-300';
      case 'ADJUSTMENT_MANUAL': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'RECEIVING': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLATION': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getReasonLabel = (reason: string): string => {
    // Note: Accepts string to handle 'all' from select dropdown too if needed, but primarily uses InventoryReason
    return reason.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateStats = () => {
    const totalIncrease = logs.reduce((sum, log) => 
      log.changeAmount > 0 ? sum + log.changeAmount : sum, 0
    );
    const totalDecrease = logs.reduce((sum, log) => 
      log.changeAmount < 0 ? sum + Math.abs(log.changeAmount) : sum, 0
    );
    const netChange = totalIncrease - totalDecrease;
    
    return { totalIncrease, totalDecrease, netChange };
  };

  const stats = calculateStats();

  // Export function with strong typing for log data
  const exportToCSV = () => {
    const headers = ['Date', 'Reason', 'Variant', 'Change', 'New Stock', 'Changed By', 'Notes'];
    const rows = logs.map((log: InventoryLog) => [
      formatDateTime(log.createdAt),
      getReasonLabel(log.reason),
      log.variant?.name || 'Base Product',
      log.changeAmount,
      log.newStock,
      log.changedByUser?.name || 'System',
      log.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-logs-${productId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); // Append to body to make it work in Firefox
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // --- 3. RENDER LOGIC ---

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Inventory History</h1>
              {product && (
                <p className="text-gray-600">{product.name}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className="text-2xl font-bold">{product?.stock || 0}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-green-600">+{stats.totalIncrease}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sold/Removed</p>
                <p className="text-2xl font-bold text-red-600">-{stats.totalDecrease}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Change</p>
                <p className={`text-2xl font-bold ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.netChange >= 0 ? '+' : ''}{stats.netChange}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select 
              value={filterReason} 
              onValueChange={(value) => setFilterReason(value as InventoryReason | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="SALE">Sale</SelectItem>
                <SelectItem value="RETURN">Return</SelectItem>
                <SelectItem value="RECEIVING">Receiving</SelectItem>
                <SelectItem value="ADJUSTMENT_MANUAL">Manual Adjustment</SelectItem>
                <SelectItem value="CANCELLATION">Cancellation</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {(filterReason !== 'all' || searchTerm || dateFrom || dateTo) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filterReason !== 'all' && (
                <Badge variant="secondary" onClick={() => setFilterReason('all')} className="cursor-pointer">
                  {getReasonLabel(filterReason)} ×
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" onClick={() => setSearchTerm('')} className="cursor-pointer">
                  Search: "{searchTerm}" ×
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge variant="secondary" onClick={() => { setDateFrom(''); setDateTo(''); }} className="cursor-pointer">
                  Date filter ×
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No inventory changes found</h3>
            <p className="text-gray-600">
              {filterReason !== 'all' || searchTerm || dateFrom || dateTo
                ? 'Try adjusting your filters'
                : 'Inventory changes will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Changes ({pagination?.totalItems || logs.length})</span>
              {pagination && (
                <span className="text-sm font-normal text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.changeAmount > 0 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {getReasonIcon(log.reason)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getReasonColor(log.reason)}>
                            {getReasonLabel(log.reason)}
                          </Badge>
                          
                          {log.variant && (
                            <Badge variant="secondary" className="gap-1">
                              <Layers className="h-3 w-3" />
                              {log.variant.name}
                            </Badge>
                          )}
                        </div>

                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Change</p>
                          <p className={`font-bold ${
                            log.changeAmount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {log.changeAmount > 0 ? '+' : ''}{log.changeAmount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">New Stock</p>
                          <p className="font-bold">{log.newStock}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Changed By</p>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={log.changedByUser?.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {log.changedByUser?.name?.charAt(0) || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {log.changedByUser?.name || 'System'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {log.notes && (
                        <div className="bg-gray-50 rounded p-3 mb-2">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-700">{log.notes}</p>
                          </div>
                        </div>
                      )}

                      {log.referenceId && (
                        <p className="text-xs text-gray-500">
                          Reference: <code className="bg-gray-100 px-2 py-0.5 rounded">{log.referenceId}</code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductInventoryLogsPage;