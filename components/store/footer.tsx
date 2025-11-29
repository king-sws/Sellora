// components/store/footer.tsx
import Link from 'next/link'
import Image from 'next/image'
import React from 'react';

import { 
  Instagram, Twitter, Facebook, Youtube, Globe
} from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';


export const StoreFooter: React.FC = () => {
  return (
    <footer className="bg-black text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Logo Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-6">
              <Image 
            src="/selloraw.png" 
            alt="Sellora" 
            width={100} 
            height={100}
            className="object-contain"
          />
            </Link>
          </div>

          {/* Shop Section */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">SHOP</h4>
            <ul className="space-y-3">
              {[
                { label: 'All Products', href: '/products' },
                { label: 'New Arrivals', href: '/new' },
                { label: 'Best Sellers', href: '/bestsellers' },
                { label: 'Sale', href: '/sale' }
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Section */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">COMPANY</h4>
            <ul className="space-y-3">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Careers', href: '/careers' },
                { label: 'Press', href: '/press' },
                { label: 'Blog', href: '/blog' }
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">SUPPORT</h4>
            <ul className="space-y-3">
              {[
                { label: 'Help Center', href: '/help' },
                { label: 'Contact Us', href: '/contact' },
                { label: 'Shipping Info', href: '/shipping' },
                { label: 'Returns', href: '/returns' },
                { label: 'Track Order', href: '/track' }
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">RESOURCES</h4>
            <ul className="space-y-3">
              {[
                { label: 'Size Guide', href: '/size-guide' },
                { label: 'Gift Cards', href: '/gift-cards' },
                { label: 'Student Discount', href: '/student' },
                { label: 'Affiliate Program', href: '/affiliate' }
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              {[
                { Icon: Instagram, label: 'Instagram', href: '#' },
                { Icon: Facebook, label: 'Facebook', href: '#' },
                { Icon: Twitter, label: 'Twitter', href: '#' },
                { Icon: Youtube, label: 'Youtube', href: '#' }
              ].map(({ Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 bg-gray-900 hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Separator className="bg-gray-900 mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Legal Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs order-2 lg:order-1">
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Cookies', href: '/cookies' },
              { label: 'Accessibility', href: '/accessibility' }
            ].map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* Language/Region Selector */}
          <div className="flex items-center gap-2 order-1 lg:order-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-gray-400  h-8"
            >
              <Globe className="w-4 h-4 mr-2" />
              United States | English
            </Button>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs text-gray-600">
            © 2025 Sellora, Inc. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Powered by Sellora
          </p>
        </div>
      </div>
    </footer>
  );
};