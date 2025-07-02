"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@contexts/CartContext";
import toast from "react-hot-toast";
import { NormalizedCatalogItem } from "@interfaces";
import React, { useState, useEffect } from 'react';
import { formatMoney, getMaxQuantity } from '@utils';

interface ProductCardProps {
  product: NormalizedCatalogItem;
  sizes?: string;
  imageConfig: {
    width: number;
    height: number;
    quality: number;
  };
}

export function ProductCard({
  product,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  imageConfig,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [mounted, setMounted] = useState(false);
  const [quickAddCount, setQuickAddCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const imageUrl = product.imageUrls?.[0] || "/images/placeholder.png";
  const stockCount = product.inventoryCount ?? 0;

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    try {
      setIsLoading(true);

      // Check if we've reached the quick add limit
      const maxQuickAdd = getMaxQuantity(stockCount);
      if (quickAddCount >= maxQuickAdd) {
        toast.error(`Maximum quick add limit reached (${maxQuickAdd})`);
        return;
      }

      const itemToAdd = {
        id: product.variationId,
        name: product.name,
        price: product.priceAmount,
        imageUrl,
      };

      addItem(itemToAdd);
      setQuickAddCount(prev => prev + 1);

      toast.success(`${product.name} added to cart!`, {
        position: "top-right",
        duration: 2000,
      });
    } catch {
      toast.error("Failed to add item to cart");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStockBadge = () => {
    // Only show badge for positive stock numbers and not when sold out
    if (product.soldOut || !stockCount || stockCount <= 0 || stockCount > 5) return null;
    
    return (
      <div className="absolute top-2 right-2 z-30 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
        Only {stockCount} left
      </div>
    );
  };

  return (
    <motion.div
      initial={false}
      animate={mounted ? { opacity: 1, y: 0 } : false}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative w-full h-[260px] md:max-w-[280px] md:h-[420px] mx-auto flex flex-col"
    >
      <Link
        href={`/product/${product.itemId}`}
        className="block h-full"
      >
        <div className="relative flex flex-col h-full overflow-hidden rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 transition-all duration-300 group-hover:border-[#E6B325]/30 group-hover:bg-gray-900/80">
          {product.soldOut && (
            <motion.div
              className="absolute inset-0 z-20 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {renderStockBadge()}

          <motion.div
            className="aspect-[4/5] h-[180px] md:aspect-[4/3] md:h-[220px] w-full bg-gradient-to-br from-black via-gray-900 to-[#E6B325] rounded-lg overflow-hidden relative"
          >
            {product.soldOut && (
              <>
                <motion.div 
                  className="absolute inset-0 z-20 bg-black/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div 
                  className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="absolute w-[141.4%] h-[32px] bg-red-500 transform -rotate-45 flex items-center justify-center"
                    style={{ transformOrigin: 'center' }}
                    initial={{ x: "-100%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <span className="text-white font-bold text-lg">SOLD OUT</span>
                  </motion.div>
                </motion.div>
              </>
            )}
            <div className="relative w-full h-full">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="w-full h-full object-contain p-0 md:p-4"
                sizes={sizes}
                quality={imageConfig?.quality || 90}
                priority={false}
              />
            </div>
          </motion.div>

          <div className="p-2 md:p-4 flex flex-col flex-1">
            <h3 className="text-xs md:text-sm font-medium text-white/90 group-hover:text-white mb-1 md:mb-2 line-clamp-2 min-h-[1.5rem] md:min-h-[2.5rem]">
              {product.name}
            </h3>
            <p className="hidden md:block text-sm text-gray-400 mb-3 line-clamp-3 max-h-[4.5em] overflow-hidden">
              {product.description}
            </p>
            <div className="flex items-center justify-between mt-auto pt-1 md:pt-2 border-t border-gray-800/50">
              <span className="text-[#E6B325] font-semibold text-sm md:text-base">
                {formatMoney(product.priceAmount, product.priceCurrency)}
              </span>
              {!product.soldOut && (
                <motion.button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isLoading || quickAddCount >= getMaxQuantity(stockCount)}
                  className={`p-2 rounded-lg ${
                    isLoading || quickAddCount >= getMaxQuantity(stockCount)
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                      : 'bg-[#E6B325]/10 text-[#E6B325] hover:bg-[#E6B325]/20'
                  } transition-colors`}
                  aria-label="Quick add to cart"
                  whileHover={!isLoading ? { scale: 1.1 } : undefined}
                  whileTap={!isLoading ? { scale: 0.95 } : undefined}
                >
                  <ShoppingCart size={18} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
