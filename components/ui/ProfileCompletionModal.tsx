"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useSearchSquareCustomer } from '@hooks/useSearchSquareCustomer';
import { useUpdateSquareCustomer } from '@hooks/useUpdateSquareCustomer';
import { toast } from 'react-hot-toast';
import { StateDropdown } from "@components/ui/StateDropdown";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { X, CheckCircle } from 'lucide-react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  redirectUrl?: string;
}

interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  zipCode: string;
  state: string;
}

export function ProfileCompletionModal({ 
  isOpen, 
  onClose, 
  onComplete,
  redirectUrl 
}: ProfileCompletionModalProps) {
  const { user } = useUser();
  const phoneNumber = user?.phoneNumbers?.[0]?.phoneNumber?.replace(/\D/g, '').slice(-10);
  const searchKey = user?.id || phoneNumber;
  const { customer, isLoading, error, mutate: refreshCustomer } = useSearchSquareCustomer(searchKey);
  const { updateCustomer, isUpdating } = useUpdateSquareCustomer();
  
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    zipCode: "",
    state: ""
  });

  const [isFormUnchanged, setIsFormUnchanged] = useState(true);

  // Load customer data into form
  useEffect(() => {
    if (customer) {
      const newFormData = {
        firstName: customer.givenName || "",
        lastName: customer.familyName || "",
        email: customer.emailAddress || "",
        phoneNumber: customer.phoneNumber || "",
        address: customer.address?.addressLine1 || "",
        city: customer.address?.locality || "",
        zipCode: customer.address?.postalCode || "",
        state: customer.address?.administrativeDistrictLevel1 || ""
      };
      setFormData(newFormData);
    }
  }, [customer]);

  // Check if form is unchanged
  useEffect(() => {
    if (!customer) {
      setIsFormUnchanged(false);
      return;
    }

    const isUnchanged = 
      formData.firstName === (customer.givenName || "") &&
      formData.lastName === (customer.familyName || "") &&
      formData.email === (customer.emailAddress || "") &&
      formData.phoneNumber === (customer.phoneNumber || "") &&
      formData.address === (customer.address?.addressLine1 || "") &&
      formData.city === (customer.address?.locality || "") &&
      formData.zipCode === (customer.address?.postalCode || "") &&
      formData.state === (customer.address?.administrativeDistrictLevel1 || "");

    setIsFormUnchanged(isUnchanged);
  }, [formData, customer]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer) {
      toast.error('No customer profile found');
      return;
    }

    try {
      const updateData = {
        customerId: customer.id,
        originalReferenceId: customer.referenceId,
        currentPhoneNumber: customer.phoneNumber,
        newPhoneNumber: formData.phoneNumber,
        userId: user?.id,
        givenName: formData.firstName,
        familyName: formData.lastName,
        emailAddress: formData.email,
        phoneNumber: formData.phoneNumber,
        address: {
          addressLine1: formData.address,
          locality: formData.city,
          postalCode: formData.zipCode,
          administrativeDistrictLevel1: formData.state,
          country: "US"
        },
        billingAddress: {
          addressLine1: formData.address,
          locality: formData.city,
          postalCode: formData.zipCode,
          administrativeDistrictLevel1: formData.state,
          country: "US"
        }
      };

      const result = await updateCustomer(updateData);
      if (result) {
        toast.success('Profile updated successfully!');
        await refreshCustomer();
        onComplete();
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-black border border-[#E6B325]/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#E6B325]">Complete Your Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E6B325] mx-auto mb-4"></div>
            <p className="text-gray-300">Loading your profile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Failed to load profile data</p>
            <Button variant="gold" onClick={() => refreshCustomer()}>
              Try Again
            </Button>
          </div>
        ) : !customer ? (
          <div className="text-center py-8">
            <p className="text-gray-300 mb-4">No customer profile found</p>
            <p className="text-sm text-gray-400 mb-6">
              Please complete your profile to continue with checkout.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                required
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <StateDropdown
                  name="state"
                  value={formData.state}
                  onChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                  className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="border-2 border-[#E6B325]/30 bg-black text-[#E6B325] focus:border-[#E6B325]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-[#E6B325]/30 text-[#E6B325] hover:bg-[#E6B325]/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                disabled={isUpdating || isFormUnchanged}
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Save & Continue
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
} 