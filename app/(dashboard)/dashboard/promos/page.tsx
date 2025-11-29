// app/dashboard/promos/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  X, 
  Loader2, 
  Calendar,
  Tag,
  Link as LinkIcon,
  Image as ImageIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface PromoModal {
  id: string;
  title: string;
  description: string;
  discountValue: string;
  couponCode?: string;
  buttonText: string;
  buttonLink: string;
  primaryColor: string;
  image?: string;
  isActive: boolean;
  showOnPages: string[];
  delaySeconds: number;
  features?: string[];
  startsAt?: string;
  expiresAt?: string;
  termsText: string;
  createdAt: string;
  updatedAt: string;
}

const PromoCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex gap-4">
        <Skeleton className="w-24 h-24 rounded" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoModal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoModal | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: 'LIMITED TIME OFFER',
    description: 'Get amazing discounts on your first purchase',
    discountValue: '25%',
    couponCode: 'WELCOME25',
    buttonText: 'Shop Now',
    buttonLink: '/products',
    primaryColor: '#06b6d4',
    image: '',
    isActive: true,
    showOnPages: ['home'],
    delaySeconds: 2,
    features: ['Valid on all products', 'Free shipping on orders over $50'],
    startsAt: '',
    expiresAt: '',
    termsText: '*Terms and conditions apply. Offer valid while supplies last.'
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  useEffect(() => {
    setImagePreview(formData.image);
  }, [formData.image]);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/promos');
      const data = await response.json();
      
      if (response.ok) {
        setPromos(data.promos || []);
      } else {
        toast.error(data.error || 'Failed to fetch promos');
      }
    } catch (error) {
      console.error('Error fetching promos:', error);
      toast.error('Failed to fetch promos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt', 'Promo image');

      const response = await fetch('/api/upload?type=other&quality=85', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({ ...prev, image: data.url }));
        setImagePreview(data.url);
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!formData.image) return;

    if (formData.image.startsWith('/uploads/')) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(formData.image)}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    setFormData(prev => ({ ...prev, image: '' }));
    setImagePreview('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.discountValue.trim()) {
      toast.error('Discount value is required');
      return;
    }

    setSubmitting(true);

    try {
      const url = editingPromo
        ? `/api/admin/promos/${editingPromo.id}`
        : '/api/admin/promos';

      const method = editingPromo ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save promo');
      }

      toast.success(
        editingPromo 
          ? 'Promo updated successfully' 
          : '🎉 Promo created successfully'
      );

      setDialogOpen(false);
      resetForm();
      fetchPromos();
    } catch (error) {
      console.error('Error saving promo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save promo');
    } finally {
      setSubmitting(false);
    }
  };

const handleDelete = async () => {
  if (!promoToDelete) return;

  try {
    const response = await fetch(`/api/admin/promos/${promoToDelete}`, {
      method: 'DELETE'
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete promo');
      } else {
        // If not JSON, it's likely an HTML error page
        throw new Error(`Failed to delete promo (Status: ${response.status})`);
      }
    }

    toast.success('🗑️ Promo deleted successfully');
    fetchPromos();
  } catch (error) {
    console.error('Error deleting promo:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to delete promo');
  } finally {
    setDeleteDialogOpen(false);
    setPromoToDelete(null);
  }
};

  const handleToggleActive = async (promo: PromoModal) => {
    try {
      const response = await fetch(`/api/admin/promos/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promo.isActive })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle promo');
      }

      toast.success(
        promo.isActive 
          ? '⏸️ Promo deactivated' 
          : '▶️ Promo activated'
      );

      fetchPromos();
    } catch (error) {
      console.error('Error toggling promo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to toggle promo');
    }
  };

  const handleEdit = (promo: PromoModal) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      description: promo.description,
      discountValue: promo.discountValue,
      couponCode: promo.couponCode || '',
      buttonText: promo.buttonText,
      buttonLink: promo.buttonLink,
      primaryColor: promo.primaryColor,
      image: promo.image || '',
      isActive: promo.isActive,
      showOnPages: promo.showOnPages,
      delaySeconds: promo.delaySeconds,
      features: promo.features || [],
      startsAt: promo.startsAt || '',
      expiresAt: promo.expiresAt || '',
      termsText: promo.termsText
    });
    setImagePreview(promo.image || '');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPromo(null);
    setFormData({
      title: 'LIMITED TIME OFFER',
      description: 'Get amazing discounts on your first purchase',
      discountValue: '25%',
      couponCode: 'WELCOME25',
      buttonText: 'Shop Now',
      buttonLink: '/products',
      primaryColor: '#06b6d4',
      image: '',
      isActive: true,
      showOnPages: ['home'],
      delaySeconds: 2,
      features: ['Valid on all products', 'Free shipping on orders over $50'],
      startsAt: '',
      expiresAt: '',
      termsText: '*Terms and conditions apply. Offer valid while supplies last.'
    });
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index)
    }));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('📋 Coupon code copied to clipboard');
  };

  const getPromoStatus = (promo: PromoModal) => {
    if (!promo.isActive) return { label: 'Inactive', color: 'bg-gray-500' };
    
    const now = new Date();
    const starts = promo.startsAt ? new Date(promo.startsAt) : null;
    const expires = promo.expiresAt ? new Date(promo.expiresAt) : null;

    if (starts && starts > now) {
      return { label: 'Scheduled', color: 'bg-blue-500' };
    }
    if (expires && expires < now) {
      return { label: 'Expired', color: 'bg-red-500' };
    }
    return { label: 'Active', color: 'bg-cyan-500' };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="h-8 w-8 text-cyan-500" />
            Promotional Modals
          </h1>
          <p className="text-gray-600 mt-2">
            Create and manage discount popups and promotional banners
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {promos.length} {promos.length === 1 ? 'Promo' : 'Promos'}
            </Badge>
            <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
              {promos.filter(p => p.isActive).length} Active
            </Badge>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Promo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                {editingPromo ? 'Edit Promotional Modal' : 'Create New Promotional Modal'}
              </DialogTitle>
              <DialogDescription>
                {editingPromo 
                  ? 'Update your promotional modal settings and content' 
                  : 'Configure your promotional modal to attract and convert customers'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="flex items-center gap-2">
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="LIMITED TIME OFFER"
                        required
                        className="font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue" className="flex items-center gap-2">
                        Discount Value <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="discountValue"
                        value={formData.discountValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                        placeholder="25% OFF"
                        required
                        className="font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Get amazing discounts on your first purchase"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="couponCode" className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Coupon Code
                      </Label>
                      <Input
                        id="couponCode"
                        value={formData.couponCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                        placeholder="WELCOME25"
                        className="font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor" className="flex items-center gap-2">
                        Primary Color
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#06b6d4"
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call to Action */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Call to Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input
                        id="buttonText"
                        value={formData.buttonText}
                        onChange={(e) => setFormData(prev => ({ ...prev, buttonText: e.target.value }))}
                        placeholder="Shop Now"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonLink">Button Link</Label>
                      <Input
                        id="buttonLink"
                        value={formData.buttonLink}
                        onChange={(e) => setFormData(prev => ({ ...prev, buttonLink: e.target.value }))}
                        placeholder="/products"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Promo Image
                  </CardTitle>
                  <CardDescription>
                    Upload an eye-catching image for your promo (Recommended: 800x600px, Max 5MB)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {imagePreview && (
                    <div className="relative rounded-lg border-2 border-dashed border-gray-300 p-4 bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Promo preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-6 right-6 shadow-lg"
                        onClick={handleRemoveImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {!imagePreview && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={uploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full h-32 border-2 border-dashed hover:border-cyan-500 hover:bg-cyan-50"
                        >
                          {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                              <span className="text-sm">Uploading...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-8 h-8 text-gray-400" />
                              <span className="text-sm font-medium">Click to upload image</span>
                              <span className="text-xs text-gray-500">JPG, PNG, WebP, GIF</span>
                            </div>
                          )}
                        </Button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-gray-500">Or enter URL</span>
                        </div>
                      </div>

                      <Input
                        value={formData.image}
                        onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        disabled={uploading}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Promo Features</CardTitle>
                  <CardDescription>
                    Add bullet points to highlight the key benefits of your promotion
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.features?.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeFeature(index)}
                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addFeature}
                    className="w-full border-dashed hover:border-cyan-500 hover:bg-cyan-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Feature
                  </Button>
                </CardContent>
              </Card>

              {/* Display Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Display Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="delaySeconds">Display Delay (seconds)</Label>
                      <Input
                        id="delaySeconds"
                        type="number"
                        min="0"
                        max="60"
                        value={formData.delaySeconds}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          delaySeconds: parseInt(e.target.value) || 0 
                        }))}
                      />
                      <p className="text-xs text-gray-500">
                        How long to wait before showing the modal
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="showOnPages">Show On Pages</Label>
                      <Select
                        value={formData.showOnPages[0] || 'home'}
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          showOnPages: [value] 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">Home Page</SelectItem>
                          <SelectItem value="products">Products Page</SelectItem>
                          <SelectItem value="all">All Pages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startsAt" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Start Date (optional)
                      </Label>
                      <Input
                        id="startsAt"
                        type="datetime-local"
                        value={formData.startsAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        End Date (optional)
                      </Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Terms & Activation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Terms & Activation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="termsText">Terms & Conditions Text</Label>
                    <Textarea
                      id="termsText"
                      value={formData.termsText}
                      onChange={(e) => setFormData(prev => ({ ...prev, termsText: e.target.value }))}
                      placeholder="*Terms and conditions apply"
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-cyan-500' : 'bg-gray-400'}`} />
                      <div>
                        <Label htmlFor="isActive" className="cursor-pointer font-semibold">
                          Activate Promo
                        </Label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formData.isActive 
                            ? 'Promo will be visible to customers' 
                            : 'Promo will be hidden from customers'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="submit" 
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                  disabled={uploading || submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : editingPromo ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {submitting ? 'Saving...' : editingPromo ? 'Update Promo' : 'Create Promo'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert for no active promos */}
      {!loading && promos.length > 0 && promos.filter(p => p.isActive).length === 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You have no active promos. Activate at least one promo to start converting visitors.
          </AlertDescription>
        </Alert>
      )}

      {/* Promos List */}
      <div className="space-y-4">
        {loading ? (
          <>
            <PromoCardSkeleton />
            <PromoCardSkeleton />
            <PromoCardSkeleton />
          </>
        ) : promos.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Tag className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No promotional modals yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Create your first promotional modal to start engaging customers with special offers and discounts.
              </p>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Promo
              </Button>
            </CardContent>
          </Card>
        ) : (
          promos.map((promo) => {
            const status = getPromoStatus(promo);
            return (
              <Card key={promo.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Promo Image */}
                    {promo.image ? (
                      <img
                        src={promo.image}
                        alt={promo.title}
                        className="w-24 h-24 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-8 h-8 text-cyan-600" />
                      </div>
                    )}

                    {/* Promo Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {promo.title}
                        </h3>
                        <Badge 
                          className={`${status.color} text-white flex-shrink-0`}
                        >
                          {status.label}
                        </Badge>
                        {promo.couponCode && (
                          <Badge 
                            variant="outline" 
                            className="font-mono flex-shrink-0 cursor-pointer hover:bg-gray-100"
                            onClick={() => copyCode(promo.couponCode!)}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {promo.couponCode}
                            <Copy className="w-3 h-3 ml-1" />
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {promo.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span className="font-semibold text-cyan-600">
                            {promo.discountValue}
                          </span>
                        </div>
                        
                        {promo.showOnPages && promo.showOnPages.length > 0 && (
                          <div className="flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            <span className="capitalize">
                              {promo.showOnPages.join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{promo.delaySeconds}s delay</span>
                        </div>

                        {promo.expiresAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Expires {new Date(promo.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {promo.features && promo.features.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {promo.features.slice(0, 3).map((feature, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {feature}
                            </Badge>
                          ))}
                          {promo.features.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{promo.features.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(promo)}
                        title={promo.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {promo.isActive ? (
                          <EyeOff className="w-4 h-4 text-gray-600" />
                        ) : (
                          <Eye className="w-4 h-4 text-cyan-600" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(promo)}
                        title="Edit promo"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>

                      <Button
  variant="outline"
  size="icon"
  onClick={() => {
    setPromoToDelete(promo.id);
    setDeleteDialogOpen(true);
  }}
  title="Delete promo"
  className="hover:bg-red-50 hover:border-red-200"
>
  <Trash2 className="w-4 h-4 text-red-600" />
</Button>

                      {promo.buttonLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(promo.buttonLink, '_blank')}
                          title="Preview link"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                        </Button>
                      )}
                      
                    </div>
                  </div>
                  
                </CardContent>
              </Card>
            );
          })
        )}
        
      </div>

{/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete Promotional Modal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this promo? This action cannot be undone and the promo will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPromoToDelete(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Promo
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}