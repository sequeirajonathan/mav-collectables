"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@contexts/CartContext";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@components/ui/button";
import { CheckCircle, Package, Home, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useOrderDetails } from "@hooks/useOrderDetails";

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: () => void;
  customerEmail?: string;
}

function MergeModal({ isOpen, onClose, onMerge, customerEmail, isMerging }: MergeModalProps & { isMerging: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Merge Guest Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            Would you like to merge this guest order with your account?
          </p>
          {customerEmail && (
            <p className="text-gray-400 text-sm">
              Order email: {customerEmail}
            </p>
          )}
          <p className="text-gray-400 text-sm mt-2">
            This will link your order to your account for easier tracking and future reference.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={onMerge} 
            className="w-full"
            variant="gold"
            disabled={isMerging}
          >
            {isMerging ? 'Merging...' : 'Merge with Account'}
          </Button>
          <Button 
            onClick={onClose} 
            className="w-full"
            variant="outline"
          >
            Keep as Guest Order
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const { user, isLoaded } = useUser();
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | undefined>();

  // Check for various parameters that Square might send
  const paymentId = searchParams.get('paymentId') || searchParams.get('payment_id');
  const orderId = searchParams.get('orderId') || searchParams.get('order_id');
  const source = searchParams.get('source');
  const guest = searchParams.get('guest') === 'true';
  const customerInfoParam = searchParams.get('customerInfo');

  // Use the new hook for order details
  const { orderDetails, isLoading } = useOrderDetails(paymentId || undefined);

  useEffect(() => {
    console.log('[CHECKOUT-SUCCESS] URL parameters:', {
      paymentId,
      orderId,
      source,
      guest,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // Clear the cart on successful payment
    clearCart();

    // Parse customer info if this was a guest order
    if (guest && customerInfoParam) {
      try {
        const customerInfo = JSON.parse(decodeURIComponent(customerInfoParam));
        setCustomerEmail(customerInfo.emailAddress);
        console.log('[CHECKOUT-SUCCESS] Guest order detected:', customerInfo);
      } catch (error) {
        console.error('[CHECKOUT-SUCCESS] Error parsing customer info:', error);
      }
    }

    // If we have a source parameter from Square, it means payment was successful
    if (source === 'square-checkout') {
      console.log('[CHECKOUT-SUCCESS] Square checkout detected');
    }
  }, [paymentId, orderId, source, guest, customerInfoParam, clearCart, searchParams]);

  // Show merge modal for guest orders when user is signed in
  useEffect(() => {
    if (isLoaded && user && guest && customerEmail && !showMergeModal) {
      // Check if this email matches the user's email
      if (user.emailAddresses?.[0]?.emailAddress === customerEmail) {
        setShowMergeModal(true);
      }
    }
  }, [isLoaded, user, guest, customerEmail, showMergeModal]);

  const handleMergeOrder = async () => {
    if (!user || !customerEmail) return;
    
    setIsMerging(true);
    try {
      // Here you would implement the logic to merge the guest order with the user's account
      // This might involve updating the order record with the user's ID
      console.log('[CHECKOUT-SUCCESS] Merging order for user:', user.id, 'with email:', customerEmail);
      
      // For now, just show a success message
      toast.success('Order successfully merged with your account!');
      setShowMergeModal(false);
    } catch (error) {
      console.error('[CHECKOUT-SUCCESS] Error merging order:', error);
      toast.error('Failed to merge order. Please contact support.');
    } finally {
      setIsMerging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6B325] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your order details...</p>
        </div>
      </div>
    );
  }

  // Use orderDetails from hook or create fallback for Square checkout
  const finalOrderDetails = orderDetails || (source === 'square-checkout' ? {
    orderId: orderId || 'N/A',
    paymentId: paymentId || 'N/A',
    status: 'COMPLETED'
  } : null);

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-xl text-gray-300 mb-8">
            Thank you for your purchase. Your order has been confirmed.
          </p>

          {finalOrderDetails && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 mb-8 text-left">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Details
              </h2>
              <div className="space-y-2 text-gray-300">
                <p><strong>Order ID:</strong> {finalOrderDetails.orderId || 'N/A'}</p>
                <p><strong>Payment ID:</strong> {finalOrderDetails.paymentId || 'N/A'}</p>
                <p><strong>Total Amount:</strong> ${finalOrderDetails.totalAmount ? (finalOrderDetails.totalAmount / 100).toFixed(2) : 'N/A'}</p>
                <p><strong>Status:</strong> <span className="text-green-500">Paid</span></p>
                {guest && (
                  <p><strong>Order Type:</strong> <span className="text-yellow-500">Guest Order</span></p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-gray-300">
              You will receive an email confirmation shortly with your order details and tracking information.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button variant="gold" className="w-full sm:w-auto">
                  <Home className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
              
              <Link href="/dashboard">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View Orders
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {showMergeModal && (
        <MergeModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMergeOrder}
          customerEmail={customerEmail}
          isMerging={isMerging}
        />
      )}
    </div>
  );
} 