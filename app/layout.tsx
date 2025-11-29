import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/SessionProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- Brand Metadata ---
export const metadata: Metadata = {
  title: "Sellora — Modern E-commerce Platform",
  description:
    "Sellora is a fast, modern, and elegant e-commerce platform built to deliver premium shopping experiences.",
  keywords: [
    "Sellora",
    "Ecommerce",
    "Online Store",
    "Marketplace",
    "Shopping Platform",
    "Next.js Ecommerce",
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/sellora.ico",
  },
  metadataBase: new URL("https://sellora.com"), // change if your domain is different
  openGraph: {
    title: "Sellora — Modern E-commerce Platform",
    description:
      "Discover a premium online shopping experience with Sellora.",
    url: "https://sellora.com",
    siteName: "Sellora",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sellora — E-commerce Platform",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
