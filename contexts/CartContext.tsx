"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import { fetcherPost, fetcher, fetcherPatch } from '@lib/swr';

interface CartItem {
  id: string;
  name: string;
  price: number; // price in cents
  quantity: number;
  imageUrl?: string;
}

interface CartData {
  items: CartItem[];
  totalPrice: number;
}

interface Cart {
  id: string;
  userId: string;
  data: CartData;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MergeCartResponse {
  success: boolean;
  cart?: Cart;
}

interface CreateCartResponse {
  cartId: string;
}

interface CartResponse {
  cart: Cart;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  cartId: string | null;
  guestId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Helper to merge guest cart with user cart
  const mergeGuestCart = async (guestId: string, userId: string) => {
    try {
      const result = await fetcherPost<MergeCartResponse>('/cart/merge', { guestId, userId });
      console.log('Cart merge result:', result);
      
      // Reload cart data after merge
      if (result.success) {
        // Clear guest cart from localStorage
        localStorage.removeItem('guestId');
        localStorage.removeItem('cartId');
        
        // Reload cart data
        const savedCartId = localStorage.getItem('cartId');
        if (savedCartId) {
          try {
            const cartData = await fetcher<CartResponse>(`/cart/${savedCartId}`);
            if (cartData.cart && cartData.cart.data && Array.isArray(cartData.cart.data.items)) {
              setItems(cartData.cart.data.items);
              setCartId(savedCartId);
            }
          } catch (error) {
            console.error('Failed to reload cart after merge:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to merge guest cart:', error);
    }
  };

  // Helper to clear stale cart data
  const clearStaleCart = () => {
    console.log('Clearing stale cart data');
    setCartId(null);
    setItems([]);
    localStorage.removeItem('cartId');
    localStorage.removeItem('cart');
  };

  // On mount, load cart from localStorage or backend
  useEffect(() => {
    let savedGuestId = localStorage.getItem('guestId');
    if (!savedGuestId) {
      savedGuestId = `guest-${uuidv4()}`;
      localStorage.setItem('guestId', savedGuestId);
    }
    setGuestId(savedGuestId);
    
    const savedCartId = localStorage.getItem('cartId');
    if (savedCartId) {
      setCartId(savedCartId);
      console.log('Loading cart from backend:', savedCartId);
      
      const loadCart = async () => {
        try {
          const data = await fetcher<CartResponse>(`/cart/${savedCartId}`);
          console.log('Cart loaded successfully:', data);
          if (data.cart && data.cart.data && Array.isArray(data.cart.data.items)) {
            setItems(data.cart.data.items);
          } else {
            console.warn('Cart data is invalid, clearing cart');
            clearStaleCart();
          }
        } catch (error) {
          console.error('Error loading cart:', error);
          if (error instanceof Error && error.message.includes('404')) {
            // Cart not found: clear cartId and show a friendly message
            localStorage.removeItem('cartId');
            clearStaleCart();
            toast.error('Your cart was not found. Please start a new cart.');
          } else {
            clearStaleCart();
          }
        } finally {
          setIsInitialized(true);
        }
      };
      
      loadCart();
    } else {
      // Fallback to localStorage cart (legacy)
      try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          setItems(parsedCart);
        }
      } catch {
        localStorage.removeItem('cart');
      } finally {
        setIsInitialized(true);
      }
    }
  }, []);

  // Handle cart merging when user signs in
  useEffect(() => {
    if (userLoaded && user && guestId && guestId.startsWith('guest-')) {
      // User is signed in and we have a guest cart, attempt to merge
      mergeGuestCart(guestId, user.id);
    }
  }, [userLoaded, user, guestId]);

  // Helper to sync cart to backend
  const syncCartToBackend = async (newItems: CartItem[], newCartId: string | null) => {
    if (!newCartId) return;
    try {
      await fetcherPatch(`/cart/${newCartId}`, {
        data: { 
          items: newItems,
          totalPrice: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        }
      });
    } catch (error) {
      console.error('Error syncing cart to backend:', error);
      if (error instanceof Error && error.message.includes('404')) {
        // Cart doesn't exist, clear the stale cartId
        console.log('Cart not found, clearing stale cartId');
        clearStaleCart();
      }
    }
  };

  // On items/cartId change, sync to backend
  useEffect(() => {
    if (!isInitialized) return;
    if (cartId) {
      syncCartToBackend(items, cartId);
      localStorage.setItem('cartId', cartId);
    } else {
      // Fallback: store in localStorage (legacy)
      try {
        localStorage.setItem('cart', JSON.stringify(items));
      } catch {}
    }
  }, [items, cartId, isInitialized]);

  const addItem = async (item: Omit<CartItem, 'quantity'>) => {
    if (!isInitialized) return;
    setItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
    // If no cartId, create cart in backend
    if (!cartId) {
      try {
        console.log('Creating cart for guest:', guestId);
        const data = await fetcherPost<CreateCartResponse>('/cart', {
          userId: guestId, 
          data: { 
            items: [{ ...item, quantity: 1 }],
            totalPrice: item.price
          }
        });
        
        console.log('Cart created successfully:', data);
        if (data.cartId) {
          setCartId(data.cartId);
          localStorage.setItem('cartId', data.cartId);
        }
      } catch (error) {
        console.error('Error creating cart:', error);
        // Don't silently fail - let the user know something went wrong
        toast.error('Failed to save cart. Please try again.');
      }
    }
  };

  const removeItem = (id: string) => {
    if (!isInitialized) return;
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (!isInitialized) return;
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    if (!isInitialized) return;
    setItems([]);
    setCartId(null);
    localStorage.removeItem('cartId');
    localStorage.removeItem('cart');
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        cartId,
        guestId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 