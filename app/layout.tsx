import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SWRConfig } from 'swr';
import { swrConfig } from '@lib/swr';
import { AppProvider } from "@contexts/AppContext";
import "@styles/globals.css";
import { CartProvider } from "@contexts/CartContext";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ClerkProvider } from '@clerk/nextjs';
import { Suspense } from 'react';
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MAV Collectables - Trading Card Game Shop",
  description:
    "Your local source for Pokémon, Yu-Gi-Oh!, Dragon Ball, One Piece and more trading cards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html 
        lang="en" 
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning={true}
      >
        <head>
          <Script
            src="https://web.squarecdn.com/v1/square.js"
            strategy="beforeInteractive"
          />
        </head>
        <body className="antialiased min-h-screen bg-black text-white font-sans flex flex-col">
          <SWRConfig value={swrConfig}>
              <AppProvider>
                <CartProvider>
                  <NuqsAdapter>
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6B325]"></div></div>}>
                      {children}
                    </Suspense>
                  </NuqsAdapter>
                </CartProvider>
              </AppProvider>
          </SWRConfig>
        </body>
      </html>
    </ClerkProvider>
  );
}
