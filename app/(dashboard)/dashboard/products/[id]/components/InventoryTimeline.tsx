// InventoryTimeline.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Removed unused Avatar imports
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ShoppingCart,
  RotateCcw,
  Settings,
  Clock,
  User,
  FileText,
  LucideIcon // Import the type for the icon component
} from 'lucide-react';

// --- 1. TYPE DEFINITIONS ---

// Define the possible reasons for an inventory change
type InventoryReason = 
  | 'SALE' 
  | 'RETURN' 
  | 'ADJUSTMENT_MANUAL' 
  | 'RECEIVING' 
  | 'CANCELLATION' 
  | 'OTHER'; // Added 'OTHER' for the default case

// Interface for the user who made the change
interface UserData {
  id: string;
  name: string;
  // Add other user fields if needed, e.g., email, avatarUrl
}

// Interface for a product variant (optional)
interface VariantData {
  id: string;
  name: string;
  // Add other variant fields if needed
}

// Interface for a single inventory log entry
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

// Interface for the API's pagination structure (assuming a typical response)
interface PaginationData {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Interface for the API response body
interface ApiResponse {
  logs: InventoryLog[];
  pagination: PaginationData;
}

// Interface for the component's props
interface InventoryTimelineProps {
  productId: string;
  variantId?: string | null; // Optional prop, can be string or null
  limit?: number; // Optional prop, defaults to 20
}

// --- 2. COMPONENT LOGIC ---

const InventoryTimeline: React.FC<InventoryTimelineProps> = ({ 
  productId, 
  variantId = null, 
  limit = 20 
}) => {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // useCallback to memoize the function, stable dependency for useEffect
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        // Pass product/variant IDs as query parameters to the API for better filtering
        productId: productId,
        ...(variantId && { variantId: variantId })
      });

      // NOTE: The original logic fetched all logs and filtered them client-side.
      // A more efficient approach is to filter on the server. I've updated the API call
      // to pass product/variant IDs in the query string.
      const response = await fetch(`/api/admin/inventory/logs?${params}`);
      
      if (response.ok) {
        // Type assertion for the fetched data
        const data: ApiResponse = await response.json();
        
        // If the API filters correctly, we can just set the logs.
        // If the API *still* returns all logs and we must client-side filter, 
        // the original filter logic (now simplified) is below:
        const newLogs = page === 1 ? data.logs : [...logs, ...data.logs];
        
        // Assuming the API returns only logs for the queried product/variant,
        // we can simplify the filtering logic if needed.
        setLogs(prevLogs => (page === 1 ? data.logs : [...prevLogs, ...data.logs]));

        // Update hasMore logic based on API response
        setHasMore(data.pagination.page < data.pagination.totalPages);

      } else {
        console.error('API response not OK:', response.status);
      }
    } catch (error) {
      console.error('Error fetching inventory logs:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, variantId, page, limit]); // Added logs as dependency to merge pages

  // The effect now relies on the `fetchLogs` function and will re-run when 
  // productId, variantId, or page changes.
  useEffect(() => {
    // Reset logs and page to 1 if product or variant changes
    if (page === 1) {
      fetchLogs();
    } else {
      setLogs([]);
      setPage(1);
    }
    
  }, [productId, variantId]);
  
  // Effect to load data when page changes
  useEffect(() => {
      fetchLogs();
  }, [page]);


  // Helper functions with clear types
  const getReasonIcon = (reason: InventoryReason): React.ReactElement => {
    // Note: We cast the return value to React.ReactElement, 
    // or specifically React.ReactElement<LucideIconProps> if more strict.
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

  const getReasonLabel = (reason: InventoryReason): string => {
    // Convert 'ADJUSTMENT_MANUAL' to 'Adjustment Manual'
    return reason.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime(); // Use .getTime() for numeric comparison
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // --- 3. RENDER LOGIC ---

  if (loading && logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Inventory History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No inventory changes recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Inventory History
          </div>
          <Badge variant="outline">{logs.length} changes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative flex gap-4">
                {/* Timeline dot and icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    log.changeAmount > 0 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {getReasonIcon(log.reason)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge 
                            variant="outline" 
                            className={getReasonColor(log.reason)}
                          >
                            {getReasonLabel(log.reason)}
                          </Badge>
                          
                          {log.variant && (
                            <Badge variant="secondary" className="text-xs">
                              {log.variant.name}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            {log.changeAmount > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`font-bold ${
                              log.changeAmount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {log.changeAmount > 0 ? '+' : ''}{log.changeAmount}
                            </span>
                          </div>
                          
                          <div className="text-gray-600">
                            New Stock: <span className="font-semibold text-gray-900">{log.newStock}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </div>
                    </div>

                    {log.notes && (
                      <div className="mb-3 text-sm text-gray-700 bg-white rounded p-3 border border-gray-200">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                          <p className="flex-1">{log.notes}</p>
                        </div>
                      </div>
                    )}

                    {log.changedByUser && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-3 w-3" />
                        <span>
                          Changed by <span className="font-medium text-gray-900">{log.changedByUser.name}</span>
                        </span>
                      </div>
                    )}

                    {log.referenceId && (
                      <div className="mt-2 text-xs text-gray-500">
                        Reference: <code className="bg-gray-200 px-2 py-0.5 rounded">{log.referenceId}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryTimeline;