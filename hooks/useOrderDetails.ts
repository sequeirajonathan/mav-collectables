import { useResource } from '@lib/swr';

interface OrderDetails {
  orderId?: string;
  paymentId?: string;
  totalAmount?: number;
  status?: string;
}

export function useOrderDetails(paymentId?: string) {
  const {
    data: orderDetails,
    error,
    isLoading,
    refresh,
  } = useResource<OrderDetails>(
    paymentId ? `/checkout/order-details?paymentId=${paymentId}` : '',
    {
      onError: (error) => {
        console.error('Failed to fetch order details:', error);
      },
    }
  );

  return {
    orderDetails,
    error,
    isLoading,
    refresh,
  };
} 