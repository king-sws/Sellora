// components/landing/DiscountModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface PromoData {
  id: string;
  title: string;
  description: string;
  discountValue: string;
  couponCode?: string;
  buttonText: string;
  buttonLink: string;
  primaryColor: string;
  image?: string;
  delaySeconds: number;
  features?: string[];
  termsText: string;
}

export default function DiscountModal() {
  const [open, setOpen] = useState(false);
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePromo();
  }, []);

  const fetchActivePromo = async () => {
    try {
      const response = await fetch('/api/promo/active');
      const data = await response.json();
      
      if (data.promo) {
        setPromo(data.promo);
        
        const hasSeenModal = sessionStorage.getItem(`promo_${data.promo.id}`);
        
        if (!hasSeenModal) {
          setTimeout(() => {
            setOpen(true);
            sessionStorage.setItem(`promo_${data.promo.id}`, 'true');
          }, data.promo.delaySeconds * 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching promo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !promo) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 gap-0">
        

        <div className="grid md:grid-cols-2">
          {/* Left side - Image or Gradient */}
          <div 
            className="relative hidden md:block h-full min-h-[400px]"
            style={{ background: promo.image ? 'transparent' : `linear-gradient(135deg, ${promo.primaryColor}, ${promo.primaryColor}dd)` }}
          >
            {promo.image ? (
              <Image 
                src={promo.image} 
                alt={promo.title} 
                fill 
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 text-white/90 mx-auto mb-4" />
                  <h3 className="text-4xl font-bold text-white">{promo.title}</h3>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Content */}
          <div className="p-8 flex flex-col justify-center">
            <Badge 
              variant="destructive" 
              className="w-fit mb-4 uppercase tracking-wide"
              style={{ backgroundColor: promo.primaryColor }}
            >
              {promo.title}
            </Badge>

            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span 
                  className="text-7xl font-black"
                  style={{ color: promo.primaryColor }}
                >
                  {promo.discountValue}
                </span>
              </div>
              {promo.description && (
                <p className="text-gray-600 text-lg">{promo.description}</p>
              )}
            </div>

            {promo.features && promo.features.length > 0 && (
              <div className="space-y-3 mb-6">
                {promo.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div 
                      className="w-1.5 h-1.5 rounded-full mt-2"
                      style={{ backgroundColor: promo.primaryColor }}
                    />
                    <p className="text-sm text-gray-600">{feature}</p>
                  </div>
                ))}
                {promo.couponCode && (
                  <div className="flex items-start gap-2">
                    <div 
                      className="w-1.5 h-1.5 rounded-full mt-2"
                      style={{ backgroundColor: promo.primaryColor }}
                    />
                    <p className="text-sm text-gray-600">
                      Use code: <span className="font-semibold text-gray-800">{promo.couponCode}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={() => {
                  window.location.href = promo.buttonLink;
                  setOpen(false);
                }}
                className="w-full text-white font-semibold"
                style={{ backgroundColor: promo.primaryColor }}
                size="lg"
              >
                {promo.buttonText}
              </Button>
              <Button 
                onClick={() => setOpen(false)}
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-700"
              >
                Maybe Later
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              {promo.termsText}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}