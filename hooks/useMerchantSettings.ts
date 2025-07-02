import { useResource } from '@lib/swr';

interface PaymentMethodSettings {
  enabled: boolean;
  orderEligibilityRange?: {
    min: { amount: number; currency: string };
    max: { amount: number; currency: string };
  };
  itemEligibilityRange?: {
    min: { amount: number; currency: string };
    max: { amount: number; currency: string };
  };
}

interface MerchantSettings {
  paymentMethods: {
    applePay: boolean;
    googlePay: boolean;
    cashApp: boolean;
    afterpayClearpay: PaymentMethodSettings;
  };
  updatedAt: string;
}

export function useMerchantSettings() {
  const { data, error, isLoading, refresh } = useResource<{ success: boolean; merchantSettings: MerchantSettings }>('/checkout/merchant-settings');

  const isPaymentMethodEnabled = (method: keyof MerchantSettings['paymentMethods']) => {
    if (!data?.merchantSettings) return false;
    
    const paymentMethod = data.merchantSettings.paymentMethods[method];
    
    if (method === 'afterpayClearpay') {
      return (paymentMethod as PaymentMethodSettings).enabled;
    }
    
    return paymentMethod as boolean;
  };

  const isAfterpayEligible = (amount: number) => {
    if (!isPaymentMethodEnabled('afterpayClearpay')) return false;
    
    const afterpaySettings = data?.merchantSettings.paymentMethods.afterpayClearpay;
    if (!afterpaySettings?.orderEligibilityRange) return false;
    
    const { min, max } = afterpaySettings.orderEligibilityRange;
    const amountInCents = amount * 100; // Convert to cents
    
    return amountInCents >= min.amount && amountInCents <= max.amount;
  };

  return {
    merchantSettings: data?.merchantSettings,
    isLoading,
    error,
    refresh,
    isPaymentMethodEnabled,
    isAfterpayEligible
  };
} 