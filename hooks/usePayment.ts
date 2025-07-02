import { fetcherPost } from '@lib/swr';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentRequest {
  customerId: string;
  amount: number;
  items: OrderItem[];
  token: string;
  paymentMethod: string;
  customerInfo?: any;
  isGuest: boolean;
  cartId: string;
  buyer?: any;
}

interface PaymentResponse {
  paymentId: string;
  orderId: string;
  status: string;
}

export function usePayment() {
  const processPayment = async (paymentData: PaymentRequest): Promise<PaymentResponse> => {
    try {
      const response = await fetcherPost<PaymentResponse, PaymentRequest>(
        '/checkout/process-payment',
        paymentData
      );
      return response;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  };

  return {
    processPayment,
  };
} 