"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, ChevronLeft, Minus, Plus } from 'lucide-react';
import { useSquareProduct } from '@hooks/useSquareProduct';
import { useCart } from '@contexts/CartContext';
import { Button } from "@components/ui/button";
import { formatMoney, getMaxQuantity } from '@utils';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: product, isLoading, error } = useSquareProduct(id);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6B325]"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Failed to load product</div>
      </div>
    );
  }

  const mainVariation = product.variations?.[0];
  const stockCount = mainVariation?.inventoryCount ?? 0;
  const isSoldOut = mainVariation?.soldOut ?? true;
  const maxQuantity = getMaxQuantity(stockCount);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!mainVariation || isSoldOut) return;
    
    if (isAddingToCart) return;

    try {
      setIsAddingToCart(true);

      // Validate quantity against stock
      if (quantity > stockCount) {
        toast.error(`Only ${stockCount} items available in stock`);
        return;
      }

      const itemToAdd = {
        id: product.id,
        name: product.name,
        price: mainVariation.priceAmount,
        imageUrl: product.imageUrls?.[0] || '/images/placeholder.png',
      };

      // Add the item multiple times based on quantity
      for (let i = 0; i < quantity; i++) {
        addItem(itemToAdd);
      }

      toast.success(`${quantity}x ${product.name} added to cart!`, {
        position: "top-right",
        duration: 2000,
      });
    } catch {
      toast.error("Failed to add item to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderStockInfo = () => {
    if (isSoldOut) {
      return (
        <div className="text-red-500 font-semibold mb-4">
          Out of Stock
        </div>
      );
    }

    return (
      <div className="text-green-500 font-semibold mb-4">
        In Stock
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative aspect-square max-w-[500px] mx-auto"
        >
          <Image
            src={product.imageUrls?.[0] || '/images/placeholder.png'}
            alt={product.name}
            fill
            className="object-contain rounded-lg"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col"
        >
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-2xl font-semibold text-[#E6B325] mb-6">
            {formatMoney(mainVariation?.priceAmount, mainVariation?.priceCurrency)}
          </p>
          <p className="text-gray-300 mb-8">{product.description}</p>

          {renderStockInfo()}

          {!isSoldOut && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-600 rounded-lg">
                  <Button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    variant="ghost"
                    size="sm"
                    className="px-3 py-2 text-gray-300 hover:text-white disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="px-4 py-2 text-white font-medium min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <Button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= maxQuantity}
                    variant="ghost"
                    size="sm"
                    className="px-3 py-2 text-gray-300 hover:text-white disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-400 select-none">
                  Max: {maxQuantity}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleAddToCart}
            disabled={isSoldOut || isAddingToCart || quantity > stockCount}
            className={`flex items-center justify-center gap-2 ${
              isSoldOut || isAddingToCart || quantity > stockCount
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-[#E6B325] hover:bg-[#FFD966] text-black'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {isSoldOut ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
