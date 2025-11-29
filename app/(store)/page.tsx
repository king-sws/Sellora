// app/page.tsx
'use client'
import BestSellersSection from "@/components/landing/CategoriesS";
import CategoriesSection from "@/components/landing/CategoriesSection";
import DealsByBrandSection from "@/components/landing/DealsByBrandSection";
import ProductCarousel from "@/components/landing/ProductsCard";
import PromoBanner from "@/components/landing/ShoppingBanner";
import AccessoriesHeroSection from "@/components/landing/AccessoriesHeroSection";
import CategoryCardsSection from "@/components/landing/CategoryCardsSection";
import DealHeroBanner from "@/components/landing/DealHeroBanner";
import AboutInfoSection from "@/components/landing/AboutInfoSection";
import NewsletterSubscription from "@/components/landing/NewsletterSubscription";
import RecentlyViewedSection from "@/components/landing/RecentlyViewedSection"; // Make sure this is imported
import HeroSection from "@/components/landing/HeroSection";
import DiscountModal from "@/components/landing/DiscountModal";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <DiscountModal />
      <HeroSection />
      <div className='px-1' >
        <PromoBanner />
      </div>
      <div className="mx-auto px-4">
        
        <RecentlyViewedSection /> {/* Add Recently Viewed Section here */}
        <CategoriesSection />
        <BestSellersSection />
        <ProductCarousel />
        <DealsByBrandSection />
      </div>
      <AccessoriesHeroSection />
      <div className="mx-auto px-4">
        <CategoryCardsSection />
      </div>
      <div className="py-5">
        <DealHeroBanner />
      </div>
      
      
      
      <AboutInfoSection />
      <NewsletterSubscription />
    </div>
  );
}