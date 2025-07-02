"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ImageIcon } from "lucide-react";
import { useCart } from "@contexts/CartContext";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import React, { useEffect, useState } from 'react';
import { Button } from "@components/ui/button";
import { formatMoney } from '@utils';
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface CartItemType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

const ImagePlaceholder = () => {
  return (
    <motion.div
      className="w-full h-full bg-gray-800/50 rounded-lg flex items-center justify-center"
      initial={false}
      animate={true}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <ImageIcon className="w-8 h-8 text-gray-400" />
    </motion.div>
  );
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [continueShoppingUrl, setContinueShoppingUrl] = useState("/category/tcg");

  useEffect(() => {
    const lastCategory = localStorage.getItem("lastCategoryUrl");
    if (lastCategory) {
      setContinueShoppingUrl(lastCategory);
    }
  }, []);

  const handleQuantityChange = (itemId: string, currentQuantity: number, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleProceedToCheckout = () => {
    if (!isLoaded) {
      return; // Still loading auth state
    }

    if (!user) {
      // Redirect to sign-in with return URL to cart
      router.push('/sign-in?redirect=/cart');
      return;
    }

    // Proceed to checkout
    router.push('/checkout');
  };

  const handleGuestCheckout = () => {
    // Proceed to guest checkout
    router.push('/checkout/guest');
  };

  const CartItem = ({ item }: { item: CartItemType }) => {
    const x = useMotionValue(0);
    const background = useTransform(
      x,
      [-100, 0, 100],
      ["rgba(239, 68, 68, 0.2)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]
    );

    const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
      if (info.offset.x < -100 && info.velocity.x < 0) {
        removeItem(item.id);
      }
    };

    return (
      <motion.div
        layout
        initial={false}
        animate={true}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden"
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ x, background }}
          className="p-3 sm:p-4 relative"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4">
            <Link href={`/product/${item.id}`} className="w-20 h-20 flex-shrink-0 relative block pointer-events-none">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-contain rounded-lg"
                  sizes="80px"
                />
              ) : (
                <ImagePlaceholder />
              )}
            </Link>
            <div className="flex-1 flex flex-col justify-between w-full">
              <Link href={`/product/${item.id}`} className="block pointer-events-none">
                <h3 className="text-base font-medium text-white line-clamp-2 break-words mb-1 hover:text-[#E6B325] transition-colors">{item.name}</h3>
                <p className="text-[#E6B325] font-semibold text-sm">{formatMoney(item.price, 'USD')}</p>
              </Link>
              <div className="flex items-center gap-2 mt-2 w-full pointer-events-auto">
                <Button
                  onClick={() => handleQuantityChange(item.id, item.quantity, item.quantity - 1)}
                  variant="secondary"
                  size="icon"
                  disabled={item.quantity <= 1}
                  className={item.quantity <= 1 ? 'opacity-50' : ''}
                >
                  <Minus size={16} />
                </Button>
                <span className="w-8 text-center text-white select-none">{item.quantity}</span>
                <Button
                  onClick={() => handleQuantityChange(item.id, item.quantity, item.quantity + 1)}
                  variant="secondary"
                  size="icon"
                >
                  <Plus size={16} />
                </Button>
                <Button
                  onClick={() => removeItem(item.id)}
                  variant="destructive"
                  size="icon"
                  aria-label="Remove item"
                  className="ml-2"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="text-4xl font-bold mb-8 text-white">SHOPPING CART</h1>
        <div className="text-center">
          <p className="text-xl mb-8 text-white">Your cart is currently empty.</p>
          <Link 
            href={continueShoppingUrl}
            className="inline-block"
          >
            <Button variant="gold">
              CONTINUE BROWSING
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white text-center">SHOPPING CART</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="space-y-4">
              <AnimatePresence>
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-4 text-sm text-gray-400 text-center md:hidden">
              Swipe left on an item to delete
            </div>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-4">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-white mb-4">Cart Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-300">
                  <span>Items ({totalItems})</span>
                  <span>{formatMoney(totalPrice, 'USD')}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t border-gray-800 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(totalPrice, 'USD')}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="gold"
                className="w-full"
                onClick={handleProceedToCheckout}
                disabled={!isLoaded}
              >
                Proceed to Checkout
              </Button>
              {!user && (
                <Button
                  variant="gold"
                  className="w-full mt-2"
                  onClick={handleGuestCheckout}
                >
                  Proceed as Guest
                </Button>
              )}
              <Link
                href={continueShoppingUrl}
                className="block text-center mt-4 text-[#E6B325] hover:text-[#FFD966] transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 