// components/admin/CategoryImageUploader.tsx
'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CategoryImageUploaderProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string) => void;
  onImageRemove?: () => void;
  categoryName: string;
  disabled?: boolean;
  className?: string;
}

export function CategoryImageUploader({
  currentImage,
  onImageChange,
  onImageRemove,
  categoryName,
  disabled = false,
  className
}: CategoryImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, WebP, or GIF.');
      return;
    }

    // Validate file size (5MB max for categories)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size too large. Maximum 5MB allowed for category images.');
      return;
    }

    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt', `${categoryName} category image`);

      // Upload with optimization
      const response = await fetch('/api/upload?type=category&optimize=true&width=1200&height=1200&quality=85', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update preview and notify parent
      setPreview(result.url);
      onImageChange(result.url);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!preview) return;

    setError(null);
    setUploading(true);

    try {
      // Delete from server
      const response = await fetch(`/api/upload?url=${encodeURIComponent(preview)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete image');
      }

      // Clear preview and notify parent
      setPreview(null);
      if (onImageRemove) {
        onImageRemove();
      }
      onImageChange('');

    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div className="relative">
        {preview ? (
          // Image Preview
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <Image
              src={preview}
              alt={categoryName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
            {/* Overlay with remove button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="bg-white/90 hover:bg-white text-gray-900"
              >
                <Upload className="w-4 h-4 mr-2" />
                Change
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled || uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
            {/* Loading overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          // Upload Button
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className={cn(
              "w-full aspect-video rounded-lg border-2 border-dashed",
              "flex flex-col items-center justify-center gap-3",
              "transition-all duration-200",
              "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              uploading && "bg-gray-50 dark:bg-gray-900",
              "border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Click to upload category image
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    PNG, JPG, WebP or GIF (max. 5MB)
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Recommended: 1200x1200px
                  </p>
                </div>
              </>
            )}
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />
      </div>

      {/* Success message */}
      {success && (
        <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            Image uploaded successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Image info (if preview exists) */}
      {preview && !uploading && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>✓ Image optimized and compressed for web</p>
          <p>✓ Automatically resized to optimal dimensions</p>
        </div>
      )}
    </div>
  );
}

// Optional: Compact version for inline use
interface CompactCategoryImageUploaderProps extends CategoryImageUploaderProps {
  compact?: boolean;
}

export function CompactCategoryImageUploader({
  compact = true,
  ...props
}: CompactCategoryImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(props.currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt', `${props.categoryName} category image`);

      const response = await fetch('/api/upload?type=category&optimize=true', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setPreview(result.url);
        props.onImageChange(result.url);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {preview ? (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <Image
            src={preview}
            alt={props.categoryName}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      
      <div className="flex-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={props.disabled || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {preview ? 'Change' : 'Upload'} Image
            </>
          )}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPreview(null);
              props.onImageChange('');
            }}
            disabled={props.disabled || uploading}
            className="ml-2"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={props.disabled || uploading}
        className="hidden"
      />
    </div>
  );
}