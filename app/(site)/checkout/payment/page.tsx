"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@components/ui/button";
import { formatMoney } from "@utils";
import {
  CheckCircle,
  Loader2,
  CreditCard,
  Apple,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { useCart as useCartContext } from "@contexts/CartContext";
import { useMerchantSettings } from "@hooks/useMerchantSettings";
import { useCart } from "@hooks/useCart";
import { usePayment } from "@hooks/usePayment";
import { toast } from "react-hot-toast";
import { ACTIVE_LOCATIONS } from "@const/locations";
import {
  PaymentForm,
  CreditCard as SquareCreditCard,
  ApplePay,
  GooglePay,
  CashAppPay,
  Afterpay,
} from "react-square-web-payments-sdk";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Define proper types for the payment callback
interface PaymentToken {
  token?: string;
  [key: string]: unknown;
}

interface PaymentBuyer {
  [key: string]: unknown;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { clearCart } = useCartContext();
  const {
    isLoading: settingsLoading,
    isPaymentMethodEnabled,
    isAfterpayEligible,
    error: settingsError,
  } = useMerchantSettings();

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "card" | "applePay" | "googlePay" | "cashApp" | "afterpay"
  >("card");
  const [isSafari, setIsSafari] = useState(false);

  const cartId = searchParams.get("cartId");
  const guest = searchParams.get("guest") === "true";

  // Use the new cart hook
  const { cart, isLoading: cartLoading, error: cartError, mergeCart } = useCart(cartId || undefined);
  const { processPayment } = usePayment();

  // Read customerInfo from localStorage if guest
  const [customerInfo, setCustomerInfo] = useState<{
    givenName: string;
    familyName: string;
    emailAddress: string;
    phoneNumber: string;
    address: {
      country: string;
      firstName: string;
      lastName: string;
      addressLine1: string;
      locality: string;
      postalCode: string;
      administrativeDistrictLevel1: string;
    };
    billing?: {
      givenName: string;
      familyName: string;
      emailAddress: string;
      phoneNumber: string;
      address: {
        country: string;
        firstName: string;
        lastName: string;
        addressLine1: string;
        locality: string;
        postalCode: string;
        administrativeDistrictLevel1: string;
      };
    };
  } | null>(null);

  // Detect Safari browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent;
      const isSafariBrowser =
        /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      setIsSafari(isSafariBrowser);
    }
  }, []);

  useEffect(() => {
    if (guest && typeof window !== "undefined") {
      const info = localStorage.getItem("customerInfo");
      if (info) {
        setCustomerInfo(JSON.parse(info));
      }
    }
  }, [guest]);

  useEffect(() => {
    if (!isLoaded) return;

    // Check if this is a guest checkout by URL parameter or localStorage
    const hasGuestInfo =
      typeof window !== "undefined" && localStorage.getItem("customerInfo");
    const isGuestCheckout = guest || hasGuestInfo;

    if (!user && !isGuestCheckout) {
      router.push("/sign-in?redirect=/checkout");
      return;
    }
    if (!cartId) {
      toast.error("Invalid payment parameters");
      router.push("/cart");
      return;
    }

    // Merge any guest cart before initializing payment
    const mergeGuestCart = async () => {
      const guestId = localStorage.getItem("guestId");
      if (guestId && guestId.startsWith("guest-") && user?.id) {
        try {
          const result = await mergeCart(guestId, user.id);
          console.log("Cart merge result on payment page:", result);
        } catch (error) {
          console.error("Failed to merge cart on payment page:", error);
        }
      }
    };

    mergeGuestCart();
  }, [isLoaded, user, cartId, router, guest, mergeCart]);

  // Handle both possible cart response structures
  const getCartData = (cartData: unknown) => {
    if (cartData && typeof cartData === 'object') {
      const cartObj = cartData as Record<string, unknown>;
      if (cartObj.cart && typeof cartObj.cart === 'object') {
        const cartData = (cartObj.cart as Record<string, unknown>).data;
        if (cartData && typeof cartData === 'object') {
          return cartData as { items: OrderItem[]; totalPrice: number };
        }
      } else if (cartObj.data && typeof cartObj.data === 'object') {
        return cartObj.data as { items: OrderItem[]; totalPrice: number };
      }
    }
    return null;
  };

  const cartData = getCartData(cart);
  const parsedItems: OrderItem[] = cartData?.items || [];
  const totalAmount = cartData?.totalPrice || 0;

  // Debug logging to help identify the issue
  console.log('Cart data:', cart);
  console.log('Total amount:', totalAmount, 'Type:', typeof totalAmount);
  console.log('Parsed items:', parsedItems);

  // Switch payment method if Cash App Pay is selected but total amount is 0
  useEffect(() => {
    if (selectedPaymentMethod === "cashApp" && totalAmount <= 0) {
      console.log('Switching from Cash App Pay due to zero total amount');
      setSelectedPaymentMethod("card");
    }
  }, [selectedPaymentMethod, totalAmount]);

  const handlePaymentSuccess = async (
    token: PaymentToken,
    buyer?: PaymentBuyer
  ) => {
    if (!token?.token) {
      toast.error("Payment tokenization failed");
      return;
    }

    try {
      const paymentResult = await processPayment({
        customerId: cart?.userId || '',
        amount: totalAmount,
        items: parsedItems,
        token: token.token,
        paymentMethod: selectedPaymentMethod,
        customerInfo: guest ? customerInfo : null,
        isGuest: guest,
        cartId: cartId || '',
        buyer: buyer,
      });

      setPaymentSuccess(true);
      clearCart();

      // Clear guest checkout info after successful payment
      if (guest && typeof window !== "undefined") {
        localStorage.removeItem("guestCheckoutInfo");
        localStorage.removeItem("customerInfo");
      }

      setTimeout(() => {
        router.push(
          `/checkout/success?paymentId=${paymentResult.paymentId}&orderId=${paymentResult.orderId}`
        );
      }, 2000);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment failed. Please try again."
      );
    }
  };

  const createPaymentRequest = () => {
    // Ensure totalAmount is a valid number greater than 0
    const amount = Math.max(0, totalAmount);
    console.log('Creating payment request with amount:', amount);
    
    // Additional validation for Cash App Pay
    if (selectedPaymentMethod === "cashApp" && amount <= 0) {
      console.error('Cash App Pay requires a positive amount, but got:', amount);
      throw new Error('Invalid payment amount for Cash App Pay');
    }
    
    return {
      countryCode: "US",
      currencyCode: "USD",
      total: {
        amount: amount.toString(),
        label: "Total",
      },
      // Required for Afterpay
      pickupContact: customerInfo
        ? {
            addressLines: [customerInfo.address.addressLine1],
            city: customerInfo.address.locality,
            countryCode: customerInfo.address.country,
            email: customerInfo.emailAddress,
            familyName: customerInfo.familyName,
            givenName: customerInfo.givenName,
            phone: customerInfo.phoneNumber,
            postalCode: customerInfo.address.postalCode,
            state: customerInfo.address.administrativeDistrictLevel1,
          }
        : undefined,
    };
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-5 h-5" />;
      case "applePay":
        return <Apple className="w-5 h-5" />;
      case "googlePay":
        return <Smartphone className="w-5 h-5" />;
      case "cashApp":
        return <DollarSign className="w-5 h-5" />;
      case "afterpay":
        return <DollarSign className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "card":
        return "Credit / Debit Card";
      case "applePay":
        return "Apple Pay";
      case "googlePay":
        return "Google Pay";
      case "cashApp":
        return "Cash App Pay";
      case "afterpay":
        return "Afterpay";
      default:
        return "Credit / Debit Card";
    }
  };

  if (cartLoading || (settingsLoading && !settingsError)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#E6B325] animate-spin" />
      </div>
    );
  }

  if (cartError || !cart) {
    console.error('Cart error details:', cartError);
    console.error('Cart data:', cart);
    
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Cart not found</h1>
          <p className="text-gray-300 mb-4">
            {cartError ? `Error: ${cartError.message || 'Unknown error'}` : 'Cart could not be loaded'}
          </p>
          <p className="text-sm text-gray-500 mb-4">Cart ID: {cartId}</p>
          <Button onClick={() => router.push("/cart")}>Return to Cart</Button>
        </div>
      </div>
    );
  }

  // Validate cart has items and valid total
  if (!parsedItems.length || totalAmount <= 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Cart</h1>
          <p className="text-gray-300 mb-4">
            {!parsedItems.length ? "Your cart is empty" : "Invalid payment amount"}
          </p>
          <Button onClick={() => router.push("/cart")}>Return to Cart</Button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-gray-300">Redirecting to confirmation page...</p>
        </div>
      </div>
    );
  }

  const availablePaymentMethods = [
    { id: "card", enabled: true },
    {
      id: "applePay",
      enabled: !settingsError && isPaymentMethodEnabled("applePay") && isSafari,
    },
    {
      id: "googlePay",
      enabled: !settingsError && isPaymentMethodEnabled("googlePay"),
    },
    {
      id: "cashApp",
      enabled: !settingsError && isPaymentMethodEnabled("cashApp") && totalAmount > 0,
    },
    {
      id: "afterpay",
      enabled:
        !settingsError &&
        isPaymentMethodEnabled("afterpayClearpay") &&
        isAfterpayEligible(totalAmount),
    },
  ].filter((method) => method.enabled);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const locationId = ACTIVE_LOCATIONS.brickAndMortar.id;

  if (!appId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
          <p className="text-gray-300">Square App ID not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Complete Payment</h1>
            <p className="text-gray-300">Secure payment powered by Square</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <div className="space-y-6">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">
                  Payment Information
                </h2>

                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {availablePaymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() =>
                          setSelectedPaymentMethod(
                            method.id as
                              | "card"
                              | "applePay"
                              | "googlePay"
                              | "cashApp"
                              | "afterpay"
                          )
                        }
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedPaymentMethod === method.id
                            ? "border-[#E6B325] bg-[#E6B325]/10"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        {getPaymentMethodIcon(method.id)}
                        <span className="flex-1 text-left">
                          {getPaymentMethodLabel(method.id)}
                        </span>
                        {selectedPaymentMethod === method.id && (
                          <div className="w-4 h-4 bg-[#E6B325] rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Form */}
                <PaymentForm
                  applicationId={appId}
                  locationId={locationId}
                  cardTokenizeResponseReceived={
                    handlePaymentSuccess as (
                      token: unknown,
                      buyer?: unknown
                    ) => void
                  }
                  createPaymentRequest={createPaymentRequest}
                >
                  {selectedPaymentMethod === "card" && (
                    <div>
                      <SquareCreditCard
                        style={{
                          ".input-container": {
                            borderColor: "#27272a",
                            borderRadius: "8px",
                          },
                          ".input-container.is-focus": {
                            borderColor: "#E6B325",
                          },
                          ".input-container.is-error": {
                            borderColor: "#ef4444",
                          },
                          ".message-text": {
                            color: "#999999",
                          },
                          ".message-text.is-error": {
                            color: "#ef4444",
                          },
                        }}
                        buttonProps={{
                          css: {
                            backgroundColor: "#E6B325",
                            color: "#18181b",
                            fontWeight: 600,
                            borderRadius: "8px",
                            fontSize: "1rem",
                            marginTop: "1rem",
                            "&:hover": {
                              backgroundColor: "#FFD700",
                            },
                          },
                        }}
                      />
                    </div>
                  )}

                  {selectedPaymentMethod === "applePay" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Apple Pay
                      </label>
                      <ApplePay />
                    </div>
                  )}

                  {selectedPaymentMethod === "googlePay" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Google Pay
                      </label>
                      <GooglePay
                        buttonColor="black"
                        buttonSizeMode="fill"
                        buttonType="long"
                      />
                    </div>
                  )}

                  {selectedPaymentMethod === "cashApp" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cash App Pay
                      </label>
                      <CashAppPay
                        shape="semiround"
                        size="medium"
                        values="dark"
                        width="full"
                        referenceId={cartId || undefined}
                        callbacks={{
                          onTokenization: (event) => {
                            console.info("Cash App Pay tokenization:", event);
                          },
                        }}
                      />
                    </div>
                  )}

                  {selectedPaymentMethod === "afterpay" && (
                    <div>
                      <Afterpay buttonColor="mint"/>
                    </div>
                  )}
                </PaymentForm>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                {parsedItems.map((item: OrderItem) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-gray-300"
                  >
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span>
                      {formatMoney(item.price * item.quantity, "USD")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between text-white font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(totalAmount, "USD")}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
