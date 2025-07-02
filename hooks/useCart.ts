import { useResource, fetcherPost } from '@lib/swr';

interface CartItem {
  id: string;
  name: string;
  price: number;
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

interface MergeCartRequest {
  guestId: string;
  userId: string;
}

interface MergeCartResponse {
  success: boolean;
  cart?: Cart;
}

export function useCart(cartId?: string) {
  const {
    data: cart,
    error,
    isLoading,
    create,
    update,
    refresh,
  } = useResource<Cart>(cartId ? `/cart/${cartId}` : '', {
    onError: (error) => {
      console.error('Cart operation failed:', error);
    },
  });

  const mergeCart = async (guestId: string, userId: string): Promise<MergeCartResponse> => {
    try {
      const result = await fetcherPost<MergeCartResponse, MergeCartRequest>(
        '/cart/merge',
        { guestId, userId }
      );
      return result;
    } catch (error) {
      console.error('Failed to merge cart:', error);
      throw error;
    }
  };

  return {
    cart,
    error,
    isLoading,
    create,
    update,
    mergeCart,
    refresh,
  };
} 