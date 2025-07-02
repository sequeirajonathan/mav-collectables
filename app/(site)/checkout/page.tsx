"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@components/ui/button";
import { CheckCircle, AlertCircle, Loader2, CreditCard, User } from "lucide-react";
import Link from "next/link";
import { useCheckout } from "@hooks/useCheckout";
import { useCart as useCartHook } from "@hooks/useCart";
import { useCart } from "@contexts/CartContext";
import { useUser } from "@clerk/nextjs";
import { ProfileCompletionModal } from "@components/ui/ProfileCompletionModal";

interface CheckoutStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  icon: React.ReactNode;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { guestId } = useCart();
  const { mergeCart } = useCartHook();
  const {
    customer,
    customerLoading,
    customerValidated,
    isProcessing,
    redirectToPayment
  } = useCheckout();

  const [showProfileModal, setShowProfileModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in?redirect=/checkout');
    }
  }, [isLoaded, user, router]);

  const steps: CheckoutStep[] = [
    {
      id: 'auth',
      title: 'Authentication',
      description: 'Sign in to continue',
      status: !user ? 'current' : 'completed',
      icon: <User className="w-5 h-5 text-white" />
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Complete your information',
      status: getProfileStatus(),
      icon: <User className="w-5 h-5 text-white" />
    },
    {
      id: 'payment',
      title: 'Payment',
      description: 'Complete your purchase',
      status: getPaymentStatus(),
      icon: <CreditCard className="w-5 h-5 text-white" />
    }
  ];

  function getProfileStatus(): 'pending' | 'current' | 'completed' | 'error' {
    if (!user) return 'pending';
    if (customerLoading) return 'pending';
    if (!customer) return 'current';
    return customerValidated ? 'completed' : 'current';
  }

  function getPaymentStatus(): 'pending' | 'current' | 'completed' | 'error' {
    if (getProfileStatus() !== 'completed') return 'pending';
    return 'pending';
  }

  const handleCompleteProfile = () => {
    setShowProfileModal(true);
  };

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    // The modal will handle the redirect if needed
  };

  const handleProceedToPayment = async () => {
    // Merge any guest cart before proceeding to payment
    if (guestId && guestId.startsWith('guest-') && user?.id) {
      try {
        const result = await mergeCart(guestId, user.id);
        console.log('Cart merge result before payment:', result);
      } catch (error) {
        console.error('Failed to merge cart before payment:', error);
      }
    }
    
    await redirectToPayment();
  };

  const renderStepContent = () => {
    // Determine current step based on status
    let currentStep = 0;
    if (!user) {
      currentStep = 0; // Auth step
    } else if (!customerValidated) {
      currentStep = 1; // Profile step
    } else {
      currentStep = 1; // Stay on profile until payment is initiated
    }

    const step = steps[currentStep];

    switch (step.id) {
      case 'auth':
        return (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-6">Please sign in to continue with your purchase.</p>
            <Link href="/sign-in?redirect=/checkout">
              <Button variant="gold">Sign In</Button>
            </Link>
          </div>
        );

      case 'profile':
        if (customerLoading) {
          return (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-[#E6B325] mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold mb-4">Loading Profile</h2>
              <p className="text-gray-300">Please wait while we load your information...</p>
            </div>
          );
        }

        if (!customer) {
          return (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
              <p className="text-gray-300 mb-6">We couldn&apos;t find your profile. Please create one to continue.</p>
              
              {/* Debug information */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left text-sm">
                <p className="text-gray-300 mb-2 font-semibold">Debug Information:</p>
                <ul className="text-gray-400 space-y-1">
                  <li>• User ID: {user?.id || 'Not available'}</li>
                  <li>• User Email: {user?.emailAddresses?.[0]?.emailAddress || 'Not available'}</li>
                  <li>• User Phone: {user?.phoneNumbers?.[0]?.phoneNumber || 'Not available'}</li>
                  <li>• Search Key: {user?.id || user?.phoneNumbers?.[0]?.phoneNumber?.replace(/\D/g, '').slice(-10) || 'Not available'}</li>
                </ul>
              </div>
              
              <Button variant="gold" onClick={handleCompleteProfile}>
                Create Profile
              </Button>
            </div>
          );
        }

        if (!customerValidated) {
          return (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
              <p className="text-gray-300 mb-6">Please complete your shipping information to continue.</p>
              
              {/* Debug information to show what's missing */}
              {customer && (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left text-sm">
                  <p className="text-gray-300 mb-2 font-semibold">Missing Information:</p>
                  <ul className="text-gray-400 space-y-1">
                    {!customer.givenName && <li>• First Name</li>}
                    {!customer.familyName && <li>• Last Name</li>}
                    {!customer.emailAddress && <li>• Email Address</li>}
                    {!customer.phoneNumber && <li>• Phone Number</li>}
                    {!customer.address?.addressLine1 && <li>• Street Address</li>}
                    {!customer.address?.locality && <li>• City</li>}
                    {!customer.address?.postalCode && <li>• ZIP Code</li>}
                  </ul>
                </div>
              )}
              
              <Button variant="gold" onClick={handleCompleteProfile}>
                Complete Profile
              </Button>
            </div>
          );
        }

        return (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Profile Complete</h2>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-gray-300 mb-2">
                <strong>Name:</strong> {customer.givenName} {customer.familyName}
              </p>
              <p className="text-gray-300 mb-2">
                <strong>Email:</strong> {customer.emailAddress}
              </p>
              <p className="text-gray-300 mb-2">
                <strong>Phone:</strong> {customer.phoneNumber}
              </p>
              <p className="text-gray-300">
                <strong>Address:</strong> {customer.address?.addressLine1}, {customer.address?.locality}, {customer.address?.postalCode}
              </p>
              
              {/* Debug information */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">Debug Info:</p>
                <p className="text-xs text-gray-500">
                  Customer ID: {customer.id} | Reference ID: {customer.referenceId}
                </p>
              </div>
            </div>
            <Button 
              variant="gold" 
              onClick={handleProceedToPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isLoaded || customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#E6B325] animate-spin" />
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
          <h1 className="text-4xl font-bold text-center mb-8">Checkout</h1>
          
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step.status === 'completed' ? 'bg-green-500 border-green-500' :
                    step.status === 'current' ? 'bg-[#E6B325] border-[#E6B325]' :
                    'bg-gray-700 border-gray-600'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      step.status === 'completed' ? 'bg-green-500' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8">
            {renderStepContent()}
          </div>
        </motion.div>
      </div>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onComplete={handleProfileComplete}
        redirectUrl="/checkout"
      />
    </div>
  );
} 