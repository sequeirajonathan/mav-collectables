"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@components/ui/button";
import { formatMoney } from "@utils";
import { CheckCircle, AlertCircle, Loader2, CreditCard, User, X } from "lucide-react";
import Link from "next/link";
import { useCart } from "@contexts/CartContext";
import { toast } from "react-hot-toast";
import { StateDropdown } from "@components/ui/StateDropdown";
import { useCustomerSearch } from '@hooks/useCustomerSearch';
import { useCart as useCartHook } from '@hooks/useCart';

interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  zipCode: string;
  state: string;
  billingFirstName?: string;
  billingLastName?: string;
  billingEmail?: string;
  billingPhoneNumber?: string;
  billingAddress?: string;
  billingCity?: string;
  billingZipCode?: string;
  billingState?: string;
}

interface CheckoutStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  icon: React.ReactNode;
}

interface ExistingCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
  customer: {
    id: string;
    email: string;
    phone: string;
    name: string;
  };
}

function ExistingCustomerModal({ isOpen, onClose, onSignIn, onContinueAsGuest, customer }: ExistingCustomerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Account Found</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            We found an account with this email/phone:
          </p>
          <div className="bg-gray-800 p-3 rounded border border-gray-600">
            <p className="text-white font-medium">{customer.name}</p>
            <p className="text-gray-400 text-sm">{customer.email}</p>
            <p className="text-gray-400 text-sm">{customer.phone}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={onSignIn} 
            className="w-full"
            variant="gold"
          >
            Sign In to Continue
          </Button>
          <Button 
            onClick={onContinueAsGuest} 
            className="w-full"
            variant="outline"
          >
            Continue as Guest
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          You can always merge your guest order with your account after checkout
        </p>
      </motion.div>
    </div>
  );
}

export default function GuestCheckoutPage() {
  const { items, totalPrice, cartId } = useCart();
  const { searchCustomer } = useCustomerSearch();
  const { create } = useCartHook();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExistingCustomerModal, setShowExistingCustomerModal] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<{
    id: string;
    email: string;
    phone: string;
    name: string;
  } | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const hasAutoAdvanced = useRef(false);

  // Initialize form data from localStorage or defaults
  const [formData, setFormData] = useState<GuestFormData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('guestCheckoutInfo');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure all optional billing fields are strings, not undefined
          return {
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            email: parsed.email || '',
            phoneNumber: parsed.phoneNumber || '',
            address: parsed.address || '',
            city: parsed.city || '',
            zipCode: parsed.zipCode || '',
            state: parsed.state || '',
            billingFirstName: parsed.billingFirstName || '',
            billingLastName: parsed.billingLastName || '',
            billingEmail: parsed.billingEmail || '',
            billingPhoneNumber: parsed.billingPhoneNumber || '',
            billingAddress: parsed.billingAddress || '',
            billingCity: parsed.billingCity || '',
            billingZipCode: parsed.billingZipCode || '',
            billingState: parsed.billingState || '',
          };
        } catch (error) {
          console.error('Error parsing saved guest checkout info:', error);
        }
      }
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      zipCode: '',
      state: '',
      billingFirstName: '',
      billingLastName: '',
      billingEmail: '',
      billingPhoneNumber: '',
      billingAddress: '',
      billingCity: '',
      billingZipCode: '',
      billingState: '',
    };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestCheckoutInfo', JSON.stringify(formData));
    }
  }, [formData]);

  // Auto-advance to payment step if we have saved info and this is the first load
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasAutoAdvanced.current) {
    const savedGuestInfo = localStorage.getItem('guestCheckoutInfo');
      const savedCustomerInfo = localStorage.getItem('customerInfo');
      
      if (savedGuestInfo && savedCustomerInfo && currentStep === 0) {
        console.log('[CHECKOUT] Auto-advancing to payment step due to saved info');
        hasAutoAdvanced.current = true;
        setCurrentStep(1);
      }
    }
  }, [currentStep]);

  const _clearGuestInfo = () => {
    if (typeof window !== 'undefined') {
    localStorage.removeItem('guestCheckoutInfo');
      localStorage.removeItem('customerInfo');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'billingSameAsShipping') {
        setBillingSameAsShipping(checked);
        // If billing same as shipping, copy shipping info to billing fields
        if (checked) {
          setFormData(prev => ({
            ...prev,
            billingFirstName: prev.firstName,
            billingLastName: prev.lastName,
            billingEmail: prev.email,
            billingPhoneNumber: prev.phoneNumber,
            billingAddress: prev.address,
            billingCity: prev.city,
            billingZipCode: prev.zipCode,
            billingState: prev.state,
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phoneNumber',
      'address', 'city', 'zipCode', 'state'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof GuestFormData]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Validate phone number (should be 10 digits)
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    // Validate ZIP code (should be 5 digits or ZIP+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(formData.zipCode)) {
      toast.error('Please enter a valid ZIP code (5 digits or ZIP+4 format)');
      return false;
    }

    return true;
  };

  const handleNextStep = async () => {
    if (!validateForm()) return;

    // Check for existing customer before proceeding
    const searchParams = {
      emailAddress: formData.email,
      phoneNumber: `+1${formData.phoneNumber.replace(/\D/g, '')}`,
      createIfNotFound: false
    };
    
    console.log('=== Guest Checkout Customer Search ===');
    console.log('Form data:', formData);
    console.log('Search parameters:', searchParams);
    
    try {
      const searchResult = await searchCustomer(searchParams);
        console.log('Search result:', searchResult);
        
        if (searchResult.exists && searchResult.customers.length > 0) {
          const found = searchResult.customers[0];
          setExistingCustomer({
            id: found.id,
            email: found.emailAddress,
            phone: found.phoneNumber,
            name: `${found.givenName || ""} ${found.familyName || ""}`.trim()
          });
          setShowExistingCustomerModal(true);
          return;
        } else {
          console.log('No existing customer found, proceeding with guest checkout');
      }
    } catch (error) {
      console.error('Error checking for existing customer:', error);
    }

    // Save guest info and proceed to next step
    setCurrentStep(1);
  };

  const handleContinueAsGuest = () => {
    // Close the modal
    setShowExistingCustomerModal(false);
    // Proceed directly to next step without checking for existing customers
    setCurrentStep(1);
  };

  const handleBackToShipping = () => {
    // Reset the auto-advance flag when user manually goes back
    console.log('[CHECKOUT] User clicked Back to Shipping. Setting hasAutoAdvanced to true and currentStep to 0');
    hasAutoAdvanced.current = true;
    setCurrentStep(0);
  };

  const _handleBackToCart = () => {
    // Form data is automatically saved by useEffect, just navigate back
    window.location.href = '/cart';
  };

  const handleCreatePaymentLink = async () => {
    setIsProcessing(true);
    
    try {
      // Check if cartId exists, if not create a new cart
      let currentCartId = cartId;
      if (!currentCartId) {
        console.log('[CHECKOUT] No cartId found, creating new cart for guest');
        
        // Get guest ID from localStorage or generate new one
        let guestId = localStorage.getItem('guestId');
        if (!guestId) {
          guestId = `guest-${crypto.randomUUID()}`;
          localStorage.setItem('guestId', guestId);
        }
        
        // Create a new cart with current items
        const cartData = await create({
            userId: guestId, 
            data: { 
              items: items,
              totalPrice: totalPrice
            } 
        });
        
        currentCartId = cartData.id;
        
        // Update localStorage with new cartId
        if (currentCartId) {
          localStorage.setItem('cartId', currentCartId);
        }
        
        console.log('[CHECKOUT] Created new cart with ID:', currentCartId);
      }

      // Prepare customer data
      const customerData = {
        emailAddress: formData.email,
        givenName: formData.firstName,
        familyName: formData.lastName,
        phoneNumber: `+1${formData.phoneNumber.replace(/\D/g, '')}`,
        address: {
          country: "US",
          firstName: formData.firstName,
          lastName: formData.lastName,
          addressLine1: formData.address,
          locality: formData.city,
          postalCode: formData.zipCode,
          administrativeDistrictLevel1: formData.state,
        },
        billing: billingSameAsShipping
          ? {
              givenName: formData.firstName,
              familyName: formData.lastName,
              emailAddress: formData.email,
              phoneNumber: `+1${formData.phoneNumber.replace(/\D/g, '')}`,
              address: {
                country: "US",
                firstName: formData.firstName,
                lastName: formData.lastName,
                addressLine1: formData.address,
                locality: formData.city,
                postalCode: formData.zipCode,
                administrativeDistrictLevel1: formData.state,
              }
            }
          : {
              givenName: formData.billingFirstName,
              familyName: formData.billingLastName,
              emailAddress: formData.billingEmail,
              phoneNumber: `+1${formData.billingPhoneNumber?.replace(/\D/g, '').slice(-10)}`,
              address: {
                country: "US",
                firstName: formData.billingFirstName,
                lastName: formData.billingLastName,
                addressLine1: formData.billingAddress,
                locality: formData.billingCity,
                postalCode: formData.billingZipCode,
                administrativeDistrictLevel1: formData.billingState,
              }
            }
      };

      // Store customer info in localStorage for payment page
      localStorage.setItem('customerInfo', JSON.stringify(customerData));
      
      // Don't clear guest checkout info yet - let it persist for return visits
      // It will be cleared after successful payment

      // Redirect to payment page with the cartId (either existing or newly created)
      window.location.href = `/checkout/payment?cartId=${currentCartId}&guest=true`;
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error('Failed to create payment link. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps: CheckoutStep[] = [
    {
      id: 'info',
      title: 'Contact Information',
      description: 'Enter your shipping details',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'payment',
      title: 'Payment',
      description: 'Complete your purchase',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending',
      icon: <CreditCard className="w-5 h-5" />
    }
  ];

  const renderStepContent = () => {
    // Check if we have saved guest info and should skip to payment (only on initial load)
    const savedGuestInfo = localStorage.getItem('guestCheckoutInfo');
    const shouldSkipToPayment = savedGuestInfo && currentStep === 0 && !hasAutoAdvanced.current;
    
    if (shouldSkipToPayment) {
      console.log('[CHECKOUT] Rendering loading state: shouldSkipToPayment is true');
      // Show loading state while step transition is handled by useEffect (only on initial load)
      return (
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#E6B325] mx-auto mb-4 animate-spin" />
          <p className="text-gray-300">Loading your saved information...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        console.log('[CHECKOUT] Rendering shipping form. formData:', formData);
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
              <p className="text-gray-300 mb-6">Please provide your shipping information to continue.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Street Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State *</label>
                <StateDropdown
                  value={formData.state}
                  onChange={val => handleInputChange({
                    target: { name: 'state', value: val, type: 'text' } as HTMLInputElement
                  } as React.ChangeEvent<HTMLInputElement>)}
                  name="state"
                  variant="dark"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="billingSameAsShipping"
                name="billingSameAsShipping"
                checked={billingSameAsShipping}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="billingSameAsShipping" className="text-gray-300 select-none cursor-pointer">
                Billing address same as shipping
              </label>
            </div>

            {!billingSameAsShipping && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-2">Billing Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <input
                      type="text"
                      name="billingFirstName"
                      value={formData.billingFirstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="billingLastName"
                      value={formData.billingLastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      name="billingEmail"
                      value={formData.billingEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="billingPhoneNumber"
                      value={formData.billingPhoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Street Address *</label>
                  <input
                    type="text"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      name="billingCity"
                      value={formData.billingCity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State *</label>
                    <StateDropdown
                      value={formData.billingState || ''}
                      onChange={val => handleInputChange({
                        target: { name: 'billingState', value: val, type: 'text' } as HTMLInputElement
                      } as React.ChangeEvent<HTMLInputElement>)}
                      name="billingState"
                      variant="dark"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      name="billingZipCode"
                      value={formData.billingZipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="gold" onClick={handleNextStep}>
                Continue to Payment
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ready to Pay</h2>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-gray-300 mb-2">
                <strong>Name:</strong> {formData.firstName} {formData.lastName}
              </p>
              <p className="text-gray-300 mb-2">
                <strong>Email:</strong> {formData.email}
              </p>
              <p className="text-gray-300 mb-2">
                <strong>Phone:</strong> {formData.phoneNumber}
              </p>
              <p className="text-gray-300">
                <strong>Address:</strong> {formData.address}, {formData.city}, {formData.state} {formData.zipCode}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                onClick={handleBackToShipping}
                className="order-2 sm:order-1"
              >
                Back to Shipping
              </Button>
              <Button 
                variant="gold" 
                onClick={handleCreatePaymentLink} 
                disabled={isProcessing}
                className="order-1 sm:order-2"
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
          </div>
        );

      default:
        return null;
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Cart is Empty</h1>
          <p className="text-gray-300 mb-6">Your cart is empty. Please add some items before checking out.</p>
          <Link href="/category/tcg">
            <Button variant="gold">Continue Shopping</Button>
          </Link>
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Guest Checkout</h1>
            <Button 
              variant="outline" 
              onClick={() => {
                // Form data is automatically saved by useEffect
                window.location.href = '/cart';
              }}
            >
              Back to Cart
            </Button>
          </div>
          
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
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

          {/* Order Summary */}
          <div className="mt-8 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-gray-300">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{formatMoney(item.price * item.quantity, 'USD')}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex justify-between text-white font-semibold">
                <span>Total ({items.length} items)</span>
                <span>{formatMoney(totalPrice, 'USD')}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showExistingCustomerModal && existingCustomer && (
        <ExistingCustomerModal
          isOpen={showExistingCustomerModal}
          onClose={() => setShowExistingCustomerModal(false)}
          onSignIn={handleNextStep}
          onContinueAsGuest={handleContinueAsGuest}
          customer={existingCustomer}
        />
      )}
    </div>
  );
} 