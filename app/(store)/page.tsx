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

// app/page.tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <DiscountModal />
      <HeroSection />
      <div className='px-1'>
        <PromoBanner />
      </div>
      <div className="mx-auto px-4">
        <RecentlyViewedSection />
        <CategoriesSection />
        <BestSellersSection />
      </div>
      
      {/* ProductCarousel outside the padded container */}
      <ProductCarousel />
      
      <div className="mx-auto px-4">
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