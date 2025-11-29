import Link from "next/link";
import React from "react";

export default function PromoBanner() {
  const banners = [
    {
      bg: "bg-[#f7f7f7]",
      title: "Shopping made easy",
      subtitle: "Enjoy reliability, secure deliveries and hassle-free returns.",
      buttonBg: "bg-black",
      buttonText: "text-white",
      titleColor: "text-[#333]",
      subtitleColor: "text-[#191919]"
    },
    {
      bg: "bg-[#92c821]",
      title: "An extra 35% off watches",
      subtitle: "Shop hot deals on timepieces from Citizen and Bulova.",
      buttonBg: "bg-[#345110]",
      buttonText: "text-[#92c821]",
      titleColor: "text-[#345110]",
      subtitleColor: "text-[#345110]"
    },
    {
      bg: "bg-[#ff5c5c]",
      title: "Wishlist-ready, wallet-approved",
      subtitle: "Step up your gifting game with unbeatable deals and coupons.",
      buttonBg: "bg-[#570303]",
      buttonText: "text-[#ff5c5c]",
      titleColor: "text-[#570303]",
      subtitleColor: "text-[#570311]"
    },
    {
      bg: "bg-[#f155a0]",
      title: "Daily Deals - 50% off",
      subtitle: "Get them before they're gone - incredible savings await.",
      buttonBg: "bg-[#360606]",
      buttonText: "text-[#df54a0]",
      titleColor: "text-[#360606]",
      subtitleColor: "text-[#36061f]"
    },
    {
      bg: "bg-[#ffbd14]",
      title: "Fashion finds up to 70% off",
      subtitle: "Express yourself with top brands for less.",
      buttonBg: "bg-[#553b06]",
      buttonText: "text-[#ffbd14]",
      titleColor: "text-[#553b06]",
      subtitleColor: "text-[#593e06]"
    },
    {
      bg: "bg-[#836bff]",
      title: "Up to 40% off power tools",
      subtitle: "Score eBay Refurbished finds with a one- or two-year warranty.",
      buttonBg: "bg-[#20092b]",
      buttonText: "text-[#836bff]",
      titleColor: "text-[#20092b]",
      subtitleColor: "text-[#20092b]"
    }
  ];

  const [banner, setBanner] = React.useState(banners[0]);

  React.useEffect(() => {
    const saved = localStorage.getItem("promoBanner");
    
    if (saved) {
      const data = JSON.parse(saved);
      const oneHour = 60 * 60 * 1000;
      const now = Date.now();

      // If less than 1 hour, reuse same banner
      if (now - data.timestamp < oneHour) {
        setBanner(banners[data.index]);
        return;
      }
    }

    // Otherwise choose a new random banner
    const randomIndex = Math.floor(Math.random() * banners.length);

    const newData = {
      index: randomIndex,
      timestamp: Date.now()
    };

    localStorage.setItem("promoBanner", JSON.stringify(newData));
    setBanner(banners[randomIndex]);
  }, []);

  return (
    <section className="w-full py-10 px-4">
      <div
        className={`${banner.bg} rounded-2xl px-4 md:px-6 lg:px-8 py-5 md:py-5 lg:py-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm`}
      >
        <div>
          <h2 className={`text-2xl font-bold ${banner.titleColor} mb-1`}>
            {banner.title}
          </h2>
          <p className={banner.subtitleColor}>{banner.subtitle}</p>
        </div>

        <Link
          href="/products"
          className={`${banner.buttonBg} ${banner.buttonText} text-base font-semibold px-6 py-3 rounded-full hover:bg-opacity-90 transition`}
        >
          Start now
        </Link>
      </div>
    </section>
  );
}
