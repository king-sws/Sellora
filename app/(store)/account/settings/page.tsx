/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/account/settings/page.tsx - Responsive Perplexity Style
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, Mail, Lock, MapPin, Bell, Shield, 
  Smartphone, Trash2, Plus, Check, AlertCircle,
  Eye, EyeOff, Save, Loader2, ArrowLeft, X, Camera, Star,
  ChevronRight, LogOut, Menu
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

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

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  productRecommendations: boolean;
}

interface AddressFormData {
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

export default function AccountSettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  
  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phone: '',
    isDefault: false
  });
  
  // Notifications state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
    productRecommendations: false,
  });

  // Dialog states
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setProfileImage(session.user.image || '');
      checkAuthProvider();
    }
    fetchAddresses();
    fetchNotifications();
  }, [session]);

  const checkAuthProvider = async () => {
    try {
      const response = await fetch('/api/profile/accounts');
      if (response.ok) {
        const accountsData = await response.json();
        setIsOAuthUser(accountsData.some((acc: any) => acc.provider !== 'credentials'));
      }
    } catch (error) {
      console.error('Error checking auth provider:', error);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/profile/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

// Enhanced version of your handleImageUpload function

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    toast.error('Image must be less than 5MB');
    return;
  }

  // Validate file type with specific allowed types
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Please upload a JPEG, PNG, or WebP image');
    return;
  }

  setImageLoading(true);

  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/profile/image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      // Update local state with new image
      setProfileImage(data.imageUrl);
      
      // Update session with new user data
      await update({
        user: {
          ...data.user,
          image: data.imageUrl,
        },
      });
      
      toast.success('Profile image updated successfully');
    } else {
      // Handle specific error messages from API
      toast.error(data.error || 'Failed to upload image');
    }
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Network error. Please try again.');
  } finally {
    setImageLoading(false);
    // Reset input so same file can be uploaded again if needed
    e.target.value = '';
  }
};

// Optional: Add image preview before upload
const handleImageUploadWithPreview = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    toast.error('Image must be less than 5MB');
    return;
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Please upload a JPEG, PNG, or WebP image');
    return;
  }

  // Show preview immediately for better UX
  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      setProfileImage(event.target.result as string);
    }
  };
  reader.readAsDataURL(file);

  setImageLoading(true);

  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/profile/image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      // Update with final optimized image URL
      setProfileImage(data.imageUrl);
      
      // Update session
      await update({
        user: {
          ...data.user,
          image: data.imageUrl,
        },
      });
      
      toast.success('Profile image updated successfully');
    } else {
      // Revert to old image on error
      setProfileImage(session?.user?.image || null);
      toast.error(data.error || 'Failed to upload image');
    }
  } catch (error) {
    // Revert to old image on error
    setProfileImage(session?.user?.image || null);
    console.error('Upload error:', error);
    toast.error('Network error. Please try again.');
  } finally {
    setImageLoading(false);
    e.target.value = '';
  }
};

// Optional: Add delete functionality
const handleImageDelete = async () => {
  setImageLoading(true);

  try {
    const response = await fetch('/api/profile/image', {
      method: 'DELETE',
    });

    const data = await response.json();

    if (response.ok) {
      setProfileImage(null);
      await update({
        user: {
          image: null,
        },
      });
      toast.success('Profile image removed');
    } else {
      toast.error(data.error || 'Failed to remove image');
    }
  } catch (error) {
    console.error('Delete error:', error);
    toast.error('Network error. Please try again.');
  } finally {
    setImageLoading(false);
  }
};



  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });

      const data = await response.json();

      if (response.ok) {
        await update({
          user: {
            name: data.user.name,
            email: data.user.email,
            image: data.user.image,
          }
        });
        
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isOAuthUser) {
      toast.error('Password changes are not available for OAuth accounts');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingAddress 
        ? `/api/addresses/${editingAddress}` 
        : '/api/addresses';
      
      const method = editingAddress ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchAddresses();
        setShowAddressForm(false);
        setEditingAddress(null);
        resetAddressForm();
        toast.success(editingAddress ? 'Address updated' : 'Address added');
      } else {
        toast.error(data.error || 'Failed to save address');
      }
    } catch (error) {
      toast.error('An error occurred while saving address');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchAddresses();
        toast.success('Default address updated');
      } else {
        toast.error('Failed to set default address');
      }
    } catch (error) {
      toast.error('Failed to set default address');
    }
  };

  const handleEditAddress = (address: Address) => {
    setAddressForm({
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company || '',
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault
    });
    setEditingAddress(address.id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async () => {
    if (!deleteAddressId) return;

    try {
      const response = await fetch(`/api/addresses/${deleteAddressId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAddresses(addresses.filter(addr => addr.id !== deleteAddressId));
        toast.success('Address deleted successfully');
      } else {
        toast.error('Failed to delete address');
      }
    } catch (error) {
      toast.error('Failed to delete address');
    } finally {
      setDeleteAddressId(null);
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
      phone: '',
      isDefault: false
    });
  };

  const handleNotificationChange = async (key: keyof NotificationSettings, value: boolean) => {
    const previousValue = notifications[key];
    setNotifications(prev => ({ ...prev, [key]: value }));
    
    try {
      const response = await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        toast.success('Notification preferences updated');
      } else {
        setNotifications(prev => ({ ...prev, [key]: previousValue }));
        toast.error('Failed to update preferences');
      }
    } catch (error) {
      setNotifications(prev => ({ ...prev, [key]: previousValue }));
      toast.error('Failed to update preferences');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account deleted successfully');
        setTimeout(() => {
          signOut({ callbackUrl: '/' });
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setDeleteLoading(false);
      setShowDeleteAccountDialog(false);
    }
  };

  const sidebarItems = [
    { id: 'profile', icon: User, label: 'Profile', description: 'Personal information' },
    { id: 'security', icon: Lock, label: 'Security', description: 'Password & 2FA' },
    { id: 'addresses', icon: MapPin, label: 'Addresses', description: 'Shipping locations' },
    { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Email preferences' },
  ];

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="flex flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-[#E5E5E5] p-4 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#333]">Settings</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mt-4 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-[#F0F0F0] text-[#333]' 
                        : 'text-[#666] hover:bg-[#FAFAF8] hover:text-[#333]'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-[#999]">{item.description}</div>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r border-[#E5E5E5] min-h-screen sticky top-0 flex-col overflow-y-auto">
          {/* Logo/Header */}
          <div className="p-6 border-b border-[#E5E5E5]">
            <h1 className="text-xl font-semibold text-[#333]">Settings</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-[#F0F0F0] text-[#333]' 
                      : 'text-[#666] hover:bg-[#FAFAF8] hover:text-[#333]'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-[#999]">{item.description}</div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className='flex justify-between items-center'>
                <div className="">
                  <h2 className="text-2xl font-semibold text-[#333] mb-2">Profile</h2>
                  <p className="text-[#666]">Manage your personal information and preferences</p>
                </div>
                {/* Back to Account Button - Shows on all sections */}
          <div className="mb-6">
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-2 hover:shadow-sm transition-all duration-200 inline-block">
              <Link
                href="/account"
                className="inline-flex items-center text-sm font-medium text-[#555] hover:text-[#111] gap-2 px-2 py-1"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to Account
              </Link>
            </div>
          </div>
              </div>

              <Card className="border-[#E5E5E5]">
                <CardContent className="p-4 sm:p-6">
                  {/* Profile Image */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 pb-8 border-b border-[#E5E5E5]">
                    <div className="relative">
                      {profileImage ? (
                        <div className="w-20 h-20 rounded-full overflow-hidden relative">
                          <Image 
                            src={profileImage} 
                            alt="Profile" 
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[#F0F0F0] flex items-center justify-center">
                          <User className="w-10 h-10 text-[#666]" />
                        </div>
                      )}
                      {imageLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="font-medium text-[#333] mb-1">Profile photo</h3>
                      <p className="text-sm text-[#666] mb-3">Recommended: 160x160px (Max 5MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageLoading}
                        className="border-[#E5E5E5] text-[#333] hover:bg-[#F5F5F5]"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Upload image
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#333] font-medium">Full name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="border-[#E5E5E5] focus:border-[#333]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[#333] font-medium">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="border-[#E5E5E5] focus:border-[#333]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[#333] font-medium">Phone number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="border-[#E5E5E5] focus:border-[#333]"
                      />
                      <p className="text-xs text-[#999]">Optional</p>
                    </div>

                    <Separator className="bg-[#E5E5E5]" />

                    <div className="space-y-2">
                      <Label className="text-[#333] font-medium">Account type</Label>
                      <div className="text-sm text-[#666] bg-[#FAFAF8] p-3 rounded-lg border border-[#E5E5E5]">
                        {session?.user?.role || 'USER'}
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full sm:w-auto bg-[#333] hover:bg-[#191919] text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save changes
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#333] mb-2">Security</h2>
                <p className="text-[#666]">Manage your password and account security</p>
              </div>

              <Card className="border-[#E5E5E5]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#333]">Change password</CardTitle>
                  <CardDescription className="text-[#666]">
                    {isOAuthUser 
                      ? 'Password changes are not available for OAuth accounts' 
                      : 'Update your password to keep your account secure'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isOAuthUser ? (
                    <Alert className="border-[#E5E5E5] bg-[#FAFAF8]">
                      <AlertCircle className="h-4 w-4 text-[#666]" />
                      <AlertDescription className="text-[#666]">
                        You signed in with Google or GitHub. Password changes are managed through your OAuth provider.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="current-password" className="text-[#333] font-medium">Current password</Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="border-[#E5E5E5] focus:border-[#333] pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#333]"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-[#333] font-medium">New password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="border-[#E5E5E5] focus:border-[#333] pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#333]"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-[#999]">Must be at least 8 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-[#333] font-medium">Confirm new password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="border-[#E5E5E5] focus:border-[#333]"
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full sm:w-auto bg-[#333] hover:bg-[#191919] text-white"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Update password
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#E5E5E5]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#333]">Two-factor authentication</CardTitle>
                  <CardDescription className="text-[#666]">Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-[#FAFAF8] rounded-lg border border-[#E5E5E5]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white border border-[#E5E5E5]">
                        <Smartphone className="h-5 w-5 text-[#666]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#333]">Authenticator app</p>
                        <p className="text-xs text-[#999]">Not enabled</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-[#E5E5E5] text-[#333] hover:bg-white">
                      Enable
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-red-600">Danger zone</CardTitle>
                  <CardDescription className="text-red-600/80">Permanently delete your account and all data</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#666] mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteAccountDialog(true)}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#333] mb-2">Addresses</h2>
                  <p className="text-[#666]">Manage your shipping and billing addresses</p>
                </div>
                <Button 
                  onClick={() => {
                    resetAddressForm();
                    setShowAddressForm(true);
                    setEditingAddress(null);
                  }}
                  className="gap-2 bg-[#333] hover:bg-[#191919] text-white w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add address
                </Button>
              </div>

              {showAddressForm && (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-[#333]">
                        {editingAddress ? 'Edit address' : 'Add new address'}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                          resetAddressForm();
                        }}
                        className="hover:bg-blue-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-[#333] font-medium">First name</Label>
                          <Input
                            id="firstName"
                            value={addressForm.firstName}
                            onChange={(e) => setAddressForm({...addressForm, firstName: e.target.value})}
                            className="border-[#E5E5E5] focus:border-[#333]"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-[#333] font-medium">Last name</Label>
                          <Input
                            id="lastName"
                            value={addressForm.lastName}
                            onChange={(e) => setAddressForm({...addressForm, lastName: e.target.value})}
                            className="border-[#E5E5E5] focus:border-[#333]"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-[#333] font-medium">Company</Label>
                        <Input
                          id="company"
                          value={addressForm.company}
                          onChange={(e) => setAddressForm({...addressForm, company: e.target.value})}
                          className="border-[#E5E5E5] focus:border-[#333]"
                          placeholder="Optional"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address1" className="text-[#333] font-medium">Address line 1</Label>
                        <Input
                          id="address1"
                          value={addressForm.address1}
                          onChange={(e) => setAddressForm({...addressForm, address1: e.target.value})}
                          className="border-[#E5E5E5] focus:border-[#333]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address2" className="text-[#333] font-medium">Address line 2</Label>
                        <Input
                          id="address2"
                          value={addressForm.address2}
                          onChange={(e) => setAddressForm({...addressForm, address2: e.target.value})}
                          className="border-[#E5E5E5] focus:border-[#333]"
                          placeholder="Optional"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-[#333] font-medium">City</Label>
                          <Input
                            id="city"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                            className="border-[#E5E5E5] focus:border-[#333]"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-[#333] font-medium">State</Label>
                          <Input
                            id="state"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                            className="border-[#E5E5E5] focus:border-[#333]"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zipCode" className="text-[#333] font-medium">ZIP code</Label>
                          <Input
                            id="zipCode"
                            value={addressForm.zipCode}
                            onChange={(e) => setAddressForm({...addressForm, zipCode: e.target.value})}
                            className="border-[#E5E5E5] focus:border-[#333]"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-[#333] font-medium">Country</Label>
                        <Input
                          id="country"
                          value={addressForm.country}
                          onChange={(e) => setAddressForm({...addressForm, country: e.target.value})}
                          className="border-[#E5E5E5] focus:border-[#333]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="addressPhone" className="text-[#333] font-medium">Phone</Label>
                        <Input
                          id="addressPhone"
                          type="tel"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                          className="border-[#E5E5E5] focus:border-[#333]"
                          placeholder="Optional"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                          className="rounded border-[#E5E5E5]"
                        />
                        <Label htmlFor="isDefault" className="cursor-pointer text-[#333]">
                          Set as default address
                        </Label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <Button type="submit" disabled={loading} className="bg-[#333] hover:bg-[#191919] text-white w-full sm:w-auto">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {editingAddress ? 'Update address' : 'Add address'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddressForm(false);
                            setEditingAddress(null);
                            resetAddressForm();
                          }}
                          className="border-[#E5E5E5] text-[#333] hover:bg-[#F5F5F5] w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {addresses.length === 0 ? (
                <Card className="border-[#E5E5E5]">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex p-4 rounded-full bg-[#F0F0F0] mb-4">
                      <MapPin className="h-8 w-8 text-[#666]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#333] mb-2">No addresses saved</h3>
                    <p className="text-[#666] mb-6">Add your first shipping address to checkout faster</p>
                    <Button 
                      onClick={() => {
                        resetAddressForm();
                        setShowAddressForm(true);
                      }}
                      variant="outline"
                      className="border-[#E5E5E5] text-[#333] hover:bg-[#F5F5F5]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add address
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <Card key={address.id} className={`border-[#E5E5E5] ${address.isDefault ? 'ring-2 ring-[#333]' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {address.isDefault && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#333] text-white mb-2">
                                <Star className="h-3 w-3 mr-1 fill-white" />
                                Default
                              </span>
                            )}
                            <h4 className="font-semibold text-[#333]">
                              {address.firstName} {address.lastName}
                            </h4>
                          </div>
                          <button
                            onClick={() => setDeleteAddressId(address.id)}
                            className="text-[#999] hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-[#666] space-y-1 leading-relaxed">
                          {address.company && <p className="font-medium text-[#333]">{address.company}</p>}
                          <p>{address.address1}</p>
                          {address.address2 && <p>{address.address2}</p>}
                          <p>{address.city}, {address.state} {address.zipCode}</p>
                          <p>{address.country}</p>
                          {address.phone && <p className="flex items-center gap-1 mt-2 text-[#999]">
                            <Smartphone className="h-3 w-3" />
                            {address.phone}
                          </p>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-[#E5E5E5]">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 border-[#E5E5E5] text-[#333] hover:bg-[#F5F5F5]"
                            onClick={() => handleEditAddress(address)}
                          >
                            Edit
                          </Button>
                          {!address.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 border-[#E5E5E5] text-[#333] hover:bg-[#F5F5F5]"
                              onClick={() => handleSetDefaultAddress(address.id)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Set default
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#333] mb-2">Notifications</h2>
                <p className="text-[#666]">Choose what updates you want to receive via email</p>
              </div>

              <Card className="border-[#E5E5E5]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#333]">Email preferences</CardTitle>
                  <CardDescription className="text-[#666]">Manage your email notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1 flex-1 pr-4">
                      <p className="text-sm font-medium text-[#333]">Order updates</p>
                      <p className="text-xs text-[#666]">Get notified about your order status and shipping</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('orderUpdates', !notifications.orderUpdates)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                        notifications.orderUpdates ? 'bg-[#333]' : 'bg-[#E5E5E5]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.orderUpdates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <Separator className="bg-[#E5E5E5]" />

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1 flex-1 pr-4">
                      <p className="text-sm font-medium text-[#333]">Promotions & discounts</p>
                      <p className="text-xs text-[#666]">Receive exclusive deals and special offers</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('promotions', !notifications.promotions)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                        notifications.promotions ? 'bg-[#333]' : 'bg-[#E5E5E5]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.promotions ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <Separator className="bg-[#E5E5E5]" />

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1 flex-1 pr-4">
                      <p className="text-sm font-medium text-[#333]">Newsletter</p>
                      <p className="text-xs text-[#666]">Weekly updates and featured products</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('newsletter', !notifications.newsletter)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                        notifications.newsletter ? 'bg-[#333]' : 'bg-[#E5E5E5]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.newsletter ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <Separator className="bg-[#E5E5E5]" />

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1 flex-1 pr-4">
                      <p className="text-sm font-medium text-[#333]">Product recommendations</p>
                      <p className="text-xs text-[#666]">Personalized product suggestions based on your interests</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('productRecommendations', !notifications.productRecommendations)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                        notifications.productRecommendations ? 'bg-[#333]' : 'bg-[#E5E5E5]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.productRecommendations ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E5E5] bg-[#FAFAF8]">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-[#666] mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-[#333] mb-1">Marketing communications</h4>
                      <p className="text-xs text-[#666] leading-relaxed">
                        We'll only send you emails you've opted into. You can unsubscribe at any time using the link in our emails.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Delete Address Dialog */}
      <AlertDialog open={!!deleteAddressId} onOpenChange={() => setDeleteAddressId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-[#E5E5E5] w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddress} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deleteConfirmDialog" className="text-[#333]">Type <strong>DELETE</strong> to confirm</Label>
            <Input
              id="deleteConfirmDialog"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="mt-2 border-[#E5E5E5] focus:border-red-600"
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setDeleteConfirm('')} className="border-[#E5E5E5] w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}