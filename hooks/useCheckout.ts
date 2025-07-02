import { useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchSquareCustomer } from '@hooks/useSearchSquareCustomer';
import { useCart } from '@contexts/CartContext';
import { useCart as useCartHook } from '@hooks/useCart';
import { fetcherPost } from '@lib/swr';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface CheckoutState {
  isProcessing: boolean;
  currentStep: number;
  customerValidated: boolean;
}

interface CreateCartRequest {
  userId: string;
  data: {
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      imageUrl?: string;
    }>;
    totalPrice: number;
  };
}

interface CreateCartResponse {
  cartId: string;
}

export function useCheckout() {
  const { user, isLoaded } = useUser();
  const { items, totalPrice } = useCart();
  const { mergeCart } = useCartHook();
  const router = useRouter();
  const phoneNumber = user?.phoneNumbers?.[0]?.phoneNumber?.replace(/\D/g, '').slice(-10);
  // Prioritize user ID over phone number to prevent finding different customers
  const searchKey = user?.id || phoneNumber;
  const { customer, isLoading: customerLoading } = useSearchSquareCustomer(searchKey);
  
  const [state, setState] = useState<CheckoutState>({
    isProcessing: false,
    currentStep: 0,
    customerValidated: false
  });

  const validateCustomerProfile = useCallback(() => {
    console.log('[USE-CHECKOUT] Validating customer profile...');
    console.log('[USE-CHECKOUT] Customer object:', customer);
    
    if (!customer) {
      console.log('[USE-CHECKOUT] No customer found');
      return false;
    }
    
    const hasRequiredInfo = Boolean(
      customer.givenName && 
      customer.familyName && 
      customer.emailAddress && 
      customer.phoneNumber && 
      customer.address?.addressLine1 && 
      customer.address?.locality && 
      customer.address?.postalCode
    );
    
    console.log('[USE-CHECKOUT] Customer validation details:', {
      hasGivenName: !!customer.givenName,
      hasFamilyName: !!customer.familyName,
      hasEmail: !!customer.emailAddress,
      hasPhone: !!customer.phoneNumber,
      hasAddressLine1: !!customer.address?.addressLine1,
      hasLocality: !!customer.address?.locality,
      hasPostalCode: !!customer.address?.postalCode,
      hasRequiredInfo
    });
    
    return hasRequiredInfo;
  }, [customer]);

  const redirectToPayment = useCallback(async () => {
    console.log('[USE-CHECKOUT] Starting redirectToPayment...');
    
    if (!customer || !validateCustomerProfile()) {
      console.log('[USE-CHECKOUT] Customer validation failed');
      toast.error('Please complete your profile before proceeding');
      return;
    }

    if (items.length === 0) {
      console.log('[USE-CHECKOUT] No items in cart');
      toast.error('Your cart is empty');
      return;
    }

    console.log('[USE-CHECKOUT] Setting processing state to true');
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Merge any guest cart before creating payment cart
      const guestId = localStorage.getItem('guestId');
      if (guestId && guestId.startsWith('guest-') && user?.id) {
        try {
          const mergeResult = await mergeCart(guestId, user.id);
          console.log('[USE-CHECKOUT] Cart merge result:', mergeResult);
        } catch (error) {
          console.error('[USE-CHECKOUT] Failed to merge cart:', error);
        }
      }

      // Save the cart to the backend and get a cartId
      const response = await fetcherPost<CreateCartResponse, CreateCartRequest>(
        '/cart',
        { userId: user?.id || '', data: { items, totalPrice } }
      );
      const { cartId } = response;

      // Build the payment page URL with only the cartId
      const paymentUrl = `/checkout/payment?cartId=${cartId}&guest=false`;
      
      console.log('[USE-CHECKOUT] Redirecting to payment page:', paymentUrl);
      
      // Redirect to the in-house payment page
      router.push(paymentUrl);
      
    } catch (error) {
      console.error('[USE-CHECKOUT] Error redirecting to payment:', error);
      toast.error('Failed to proceed to payment. Please try again.');
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [customer, validateCustomerProfile, items, totalPrice, router, user?.id, mergeCart]);

  const resetCheckout = useCallback(() => {
    setState({
      isProcessing: false,
      currentStep: 0,
      customerValidated: false
    });
  }, []);

  return {
    // State
    isProcessing: state.isProcessing,
    currentStep: state.currentStep,
    customerValidated: validateCustomerProfile(),
    
    // Customer data
    customer,
    customerLoading,
    
    // Auth state
    user,
    isLoaded,
    
    // Actions
    redirectToPayment,
    resetCheckout,
    validateCustomerProfile
  };
} 