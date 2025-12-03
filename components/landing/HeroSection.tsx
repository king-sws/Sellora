import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  image: string;
  alt: string;
}

interface Slide {
  id: number;
  layout: "products" | "background" | "single-image";
  title: string;
  highlight?: string;
  titleEnd?: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  textColor?: string;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  products?: Product[];
  backgroundImage?: string;
}

const slides: Slide[] = [
  {
    id: 1,
    layout: "products",
    title: "Score the phone you want for less",
    subtitle:
      "Get up to 65% off brands you love with sellora Refurbished",
    ctaText: "Shop cell phones",
    textColor: "#20092b",

    ctaLink: "/shop",
    backgroundColor: "#836bff",
    gradientFrom: "bg-[#20092b]",
    gradientTo: "bg-[#20092b]",
    products: [
      {
        id: 1,
        image:
          "/image/phone1.webp",
        alt: "Racing Seat",
      },
      {
        id: 2,
        image:
          "/image/phone2.webp",
        alt: "Floor Mats",
      },
      {
        id: 3,
        image:
          "/image/phone3.webp",
        alt: "LED Light Bar",
      },
    ],
  },
  {
    id: 2,
    layout: "background",
    title: "Returns made simple",
    subtitle: "Not happy with your purchase? It's easy to start a return.",
    ctaText: "Learn more",
    textColor: "#ffffff",
    ctaLink: "/parts",
    backgroundImage: "/download.webp",
    gradientFrom: "bg-white/10 hover:bg-white/20",
    gradientTo: "bg-white/10 hover:bg-white/20",
  },
  {
    id: 3,
    layout: "products",
    title: "Electro deals",
    highlight: "-20%",
    titleEnd: "on top brands.",
    subtitle:
      "Grab the best discounts on high-quality electronics and car gadgets.",
    ctaText: "Shop now",
    ctaLink: "/shop",
    backgroundColor: "#ff6a38",
    gradientFrom: "bg-[#191919]",
    gradientTo: "bg-[#191919]",
    textColor: "#191919",
    products: [
      {
        id: 1,
        image: "/image/20.webp",
        alt: "Electronics Sale",
      },
    ],
  },
  {
    id: 4,
    layout: "products",
    title: "Wishlist-ready, wallet-approved",
    subtitle:
      "Step up your gifting game with unbeatable deals and coupons.",
    ctaText: "Save Here",
    ctaLink: "/wishlist",
    backgroundColor: "#ff5c5c",
    textColor: "#570303",
    gradientFrom: "bg-[#570303]",
    gradientTo: "bg-[#570303]",
    products: [
      {
        id: 1,
        image: "/image/products.webp",
        alt: "Gift Products",
      },
    ],
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const handlePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsAnimating(false), 700);
  };

useEffect(() => {
    if (isAutoPlaying) {
      autoPlayTimer.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 7000);
    }
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isAutoPlaying]);

  const slide = slides[currentSlide];

  return (
    <section className="relative w-full h-[55vh] sm:h-[50vh] md:h-[50vh] lg:h-[70vh] overflow-hidden">
  
  {/* Background Layer */}
  <div 
    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700" 
    style={{ 
      backgroundColor: slide.backgroundColor || '#f3f4f6',
      backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : 'none'
    }}
  ></div>

 

      {/* Gradient Overlay */}
        {/* <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent sm:via-black/50"></div> */}
      {/* Content */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-12  py-14 sm:py-0">
        {/* Left Side - Text */}
        <div
          className={`max-w-xl mb-8  transition-all duration-700 ${
            isAnimating
              ? "opacity-0 -translate-x-5"
              : "opacity-100 translate-x-0"
          }`}
          style={{ color: slide.textColor || '#000000' }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 sm:mb-5 ">
            {slide.title}{" "}
            {slide.highlight && (
              <span
                className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.gradientFrom} ${slide.gradientTo}`}
              >
                {slide.highlight}
              </span>
            )}
            {slide.titleEnd && ` ${slide.titleEnd}`}
          </h1>

          <p className="text-[17px] font-medium sm:text-base mb-6 sm:mb-8 leading-relaxed" style={{ color: slide.textColor || '#000000', opacity: 0.8 }}>
                        {slide.subtitle}
          </p>

          <Link
            href={slide.ctaLink}
            className={`inline-block px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-semibold text-base sm:text-lg 
              bg-gradient-to-r ${slide.gradientFrom} ${slide.gradientTo} text-white 
              transition-transform hover:scale-105 shadow-lg`}
          >
            {slide.ctaText} →
          </Link>
        </div>

        {/* Right Side - Products */}
        {slide.products && (
          <div
            className={`transition-all duration-700 ${
              isAnimating
                ? "opacity-0 translate-x-5"
                : "opacity-100 translate-x-0"
            }`}
          >
            <div
              className={`grid gap-3 sm:gap-4 ${
                slide.products.length === 1
                  ? "grid-cols-1"
                  : slide.products.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3 sm:grid-cols-3"
              }`}
            >
              {slide.products.map((product) => (
                <img
                  key={product.id}
                  src={product.image}
                  alt={product.alt}
                  className={`object-cover  transition-transform duration-500 ${
                    slide.products?.length === 1
                      ? "w-full  h-auto sm:mt-0 -mt-[4rem] md:-mt-[0rem] lg:-mt-0 mx-auto" //max-w-xs sm:max-w-sm lg:max-w-lg
                      : "w-32 h-32 rounded-lg sm:rounded-xl sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 sm:mt-0 -mt-4"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-7 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (!isAnimating) {
                setIsAnimating(true);
                setCurrentSlide(index);
                setTimeout(() => setIsAnimating(false), 700);
              }
            }}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide
                ? "w-8 bg-white"
                : "w-2 bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-8 flex items-center gap-2 sm:gap-3 z-20">
        <button
          onClick={handlePrev}
          className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
        </button>
        <button
          onClick={handleNext}
          className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
        </button>
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm"
          aria-label={isAutoPlaying ? "Pause autoplay" : "Start autoplay"}
        >
          {isAutoPlaying ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          )}
        </button>
      </div>
    </section>
  );
}