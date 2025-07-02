"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import AnnouncementCarousel from "@components/ui/AnnouncementCarousel";
import VideoSection from "@components/ui/VideoSection";
import { motion } from "framer-motion";
import { CATEGORY_MAPPING } from "@const/categories";
import { useRouter } from "next/navigation";
import GoogleReviews from "@components/ui/GoogleReviews";
import Link from "next/link";
import { Button } from "@components/ui/button";
import NearestEventSection from "@components/ui/NearestEventSection";
import { useFeatureFlags } from "@hooks/useFeatureFlag";

export default function Home() {
  const { data: featureFlags = [] } = useFeatureFlags();
  const [mounted, setMounted] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check if running in Electron
    setIsElectron(window.navigator.userAgent.includes('Electron'));
  }, []);

  // If running in Electron, don't render the home page
  if (isElectron) {
    return null;
  }

  const announcements = [
    {
      id: "1",
      title: "New Pokémon TCG Releases",
      description:
        "Check out the latest Paldean Fates expansion, now available in store and online!",
      buttonText: "Shop Now",
      buttonLink: "/category/pokemon-tcg?group=TCG",
      bgColor: "bg-gradient-to-r from-blue-900 to-purple-900",
    },
    {
      id: "2",
      title: "Weekly Tournament - Friday Nights",
      description:
        "Join us every Friday at 6PM for our weekly Pokémon TCG tournament. All skill levels welcome!",
      buttonText: "Learn More",
      buttonLink: "/category/events",
      bgColor: "bg-gradient-to-r from-gray-900 to-gray-800",
    },
    {
      id: "3",
      title: "Free Shipping on Orders Over $50",
      description:
        "For a limited time, get free shipping on all orders over $50. No coupon needed!",
      buttonText: "Start Shopping",
      buttonLink: "/category/tcg",
      bgColor: "bg-gradient-to-r from-[#B38A00]/20 to-[#E6B325]/20",
    },
  ];

  const getTopCardGames = () => {
    // In sandbox, only show Pokémon
    if (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT !== 'production') {
      const pokemonCategory = CATEGORY_MAPPING.pokemon;
      if (pokemonCategory) {
        return [{
          title: pokemonCategory.displayName,
          href: `/category/${pokemonCategory.slug}`,
          image: "/pokemon-logo.png",
          squareCategory: pokemonCategory.displayName,
          scaleClass: "scale-85 md:scale-95",
        }];
      }
      return [];
    }

    // In production, show all top card games
    const topSlugs = [
      "pokemon",
      "magic",
      "onepiece",
      "dragonball",
      "digimon",
      "yugioh",
      "weiss",
      "union",
    ];

    const imageMap: Record<string, string> = {
      pokemon: "/pokemon-logo.png",
      magic: "/magic_1.webp",
      onepiece: "/one-piece-card-game.jpg",
      dragonball: "/dragonball.png",
      digimon: "/digimon_card_game_logo.png",
      yugioh: "/yugioh-logo.png",
      weiss: "/weiss.png",
      union: "/union.png",
    };

    return topSlugs
      .map((slug) => CATEGORY_MAPPING[slug])
      .filter(Boolean)
      .map((category) => ({
        title: category.displayName,
        href: `/category/${category.slug}`,
        image: imageMap[category.slug] || `/${category.slug}-logo.png`,
        squareCategory: category.displayName,
        scaleClass:
          category.slug === "dragonball"
            ? "scale-90 md:scale-95"
            : category.slug === "union"
            ? "scale-95 md:scale-100"
            : category.slug === "yugioh"
            ? "scale-65 md:scale-75 object-center"
            : "scale-85 md:scale-95",
      }));
  };

  const cardGames = getTopCardGames();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  function handleCardGameClick(displayName: string) {
    // Find the mapping by displayName (case-insensitive)
    const mapping = Object.values(CATEGORY_MAPPING).find(
      (cat) => cat.displayName.toLowerCase() === displayName.toLowerCase()
    );
    if (!mapping) return;
    const params = new URLSearchParams();
    params.set("group", "TCG");
    router.push(`/category/${mapping.slug}?${params.toString()}`);
  }

  // Show Google Reviews only if the feature flag is enabled and we have feature flags data
  const showGoogleReviews = featureFlags?.length > 0 && 
    featureFlags.find((f) => f.name === "showGoogleReviews")?.enabled;

  return (
    <div className="flex flex-col w-full min-h-screen space-y-12 pt-2">
      {/* Video Hero */}
      <VideoSection />

      {/* Announcements Carousel */}
      <div className="w-full">
        <AnnouncementCarousel announcements={announcements} />
      </div>

      {/* ─── Trading Card Games ─────────────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        className="flex items-center w-full"
      >
        <div className="h-px bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#E6B325] flex-grow" />
        <span className="mx-4 text-2xl font-bold text-[#E6B325] uppercase">
          Trading Card Games
        </span>
        <div className="h-px bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#E6B325] flex-grow" />
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8"
      >
        {cardGames.map((game) => (
          <motion.div
            key={game.href}
            variants={item}
            className="group relative flex flex-col cursor-pointer"
            onClick={() => handleCardGameClick(game.title)}
          >
            <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 transition-all duration-300 group-hover:border-brand-blue/30 group-hover:bg-gray-900/80">
              <Image
                src={game.image}
                alt={game.title}
                fill
                className={`object-contain transition-transform duration-300 group-hover:scale-105 ${game.scaleClass}`}
                sizes="(max-width:640px)100vw,(max-width:768px)50vw,(max-width:1024px)33vw,25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="mt-2 text-center">
              <h3 className="text-lg md:text-xl font-bold group-hover:text-[#E6B325] transition-colors">
                {game.title}
              </h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Community Divider ─────────────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        className="flex items-center w-full"
      >
        <div className="h-px bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#E6B325] flex-grow" />
        <span className="mx-4 text-2xl font-bold text-[#E6B325] uppercase">
          Community
        </span>
        <div className="h-px bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#E6B325] flex-grow" />
      </motion.div>

      {/* Community + Upcoming Event side by side */}
      <div className="w-full flex flex-col md:flex-row gap-6">
        {/* Discord Card */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex-shrink-0 w-full md:w-1/3 md:h-[340px]"
        >
          <motion.div
            variants={item}
            className="cursor-pointer h-full"
            onClick={() => window.open("https://discord.gg/szgNfjR8", "_blank")}
          >
            <div className="relative w-full h-full md:h-full bg-gradient-to-br from-[#5865F2]/80 to-black border border-brand-blue/20 hover:border-brand-blue/40 flex flex-col items-center justify-center rounded-lg shadow-xl px-8 md:px-12 pt-3 pb-6 md:pt-4 md:pb-8 transition-transform hover:scale-[1.02]">
              <div className="flex flex-col items-center justify-center flex-grow w-full">
                <div className="relative w-32 h-32 mb-4 md:w-36 md:h-36 flex items-center justify-center mx-auto">
                  <Image
                    src="/mav_collectibles.png"
                    alt="MAV Collectibles Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-6 mt-2">
                  Join Our Discord
                </h3>
              </div>
              <span className="inline-block px-3 py-1 bg-[#5865F2] text-white rounded-full text-xs font-semibold mt-4">
                discord.gg/szgNfjR8
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Upcoming Event Card */}
        <div className="flex-1 h-[340px]">
          <NearestEventSection hideTitle />
        </div>
      </div>

      {/* ─── Why Us Divider ─────────────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        className="flex items-center w-full"
      >
        <div className="h-px bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#E6B325] flex-grow" />
        <span className="mx-4 text-2xl font-bold text-[#E6B325] uppercase">
          Why Us?
        </span>
        <div className="h-px bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#E6B325] flex-grow" />
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate={mounted ? "show" : "hidden"}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {[
          {
            title: "Quality Selection",
            description:
              "We carefully curate our inventory to offer only the best cards.",
          },
          {
            title: "Expert Knowledge",
            description:
              "Our team is passionate about trading cards and ready to help.",
          },
          {
            title: "Community Focus",
            description:
              "We're more than a store – we're a hub for collectors and players, where everyone gets treated like family.",
          },
        ].map((feature, i) => (
          <motion.div
            key={i}
            variants={item}
            className="p-6 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800/50 hover:border-brand-blue/30 transition-all duration-300 hover:bg-gray-900/80"
          >
            <h3 className="text-xl font-semibold mb-2 text-brand-blue-light">
              {feature.title}
            </h3>
            <p className="text-gray-300">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Google Reviews & Continue Browsing */}
      {showGoogleReviews && <GoogleReviews />}
      <div className="mt-8 text-center">
        <Link href="/category/tcg">
          <Button variant="gold">CONTINUE BROWSING</Button>
        </Link>
      </div>
    </div>
  );
}
