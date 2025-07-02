"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser, useReverification } from "@clerk/nextjs";
import { useSearchSquareCustomer } from '@hooks/useSearchSquareCustomer';
import { useUpdateSquareCustomer } from '@hooks/useUpdateSquareCustomer';
import { toast } from 'react-hot-toast';
import { StateDropdown } from "@components/ui/StateDropdown";
import { Copy, ShieldCheck } from 'lucide-react';
import { useCart as useCartHook } from '@hooks/useCart';
import { useUserOperations } from '@hooks/useUserOperations';
import { fetcherPost } from '@lib/swr';

interface CustomerFormData {
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
  billingSameAsShipping?: boolean;
}

export default function ProfilePage() {
  const { user } = useUser();
  const phoneNumber = user?.phoneNumbers?.[0]?.phoneNumber?.replace(/\D/g, '').slice(-10);
  
  // Prioritize user ID over phone number to prevent creating new customers when phone number changes
  const searchKey = user?.id || phoneNumber;
  const { customer, isLoading, error, mutate: refreshCustomer, checkPhoneNumberAvailability } = useSearchSquareCustomer(searchKey);
  const { updateCustomer, isUpdating } = useUpdateSquareCustomer();
  const { mergeCart } = useCartHook();
  const { updatePhone, updateEmail, promotePhone, promoteEmail } = useUserOperations();
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    zipCode: "",
    billingFirstName: "",
    billingLastName: "",
    billingEmail: "",
    billingPhoneNumber: "",
    billingAddress: "",
    billingCity: "",
    billingZipCode: "",
    billingState: "",
    billingSameAsShipping: true,
    state: ""
  });
  const [originalFormData, setOriginalFormData] = useState<CustomerFormData | null>(null);
  const [referenceId, setReferenceId] = useState<string | undefined>(undefined);
  const [isPhoneUpdating, setIsPhoneUpdating] = useState(false);
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPhoneConfirmation, setShowPhoneConfirmation] = useState(false);
  const [pendingPhoneUpdate, setPendingPhoneUpdate] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmailUpdate, setPendingEmailUpdate] = useState<string | null>(null);
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);
  
  // Verification states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const updatePhoneNumber = useReverification(async (newPhone: string) => {
    // Use the server-side API route to update the phone number
    await updatePhone(newPhone);
    console.log('Phone number updated successfully via API');
  });

  const updateEmailAddress = useReverification(async (newEmail: string) => {
    console.log('=== Profile Page: Email Update Started ===');
    console.log('New email address:', newEmail);
    
    // Use the server-side API route to update the email address
    await updateEmail(newEmail);
    console.log('Email address updated successfully via API');
  });

  // Handle phone number confirmation
  const handlePhoneNumberConfirmation = async () => {
    if (!pendingPhoneUpdate) return;
    setIsPhoneUpdating(true);
    try {
      await updatePhoneNumber(pendingPhoneUpdate);
          console.log('Clerk phone number updated successfully');
      setShowPhoneConfirmation(false);
      setPendingPhoneUpdate(null);

      // Refetch Clerk user to get the new phone number
      await user?.reload();

      // Now find the new unverified phone and trigger verification
      const unverified = user?.phoneNumbers?.find(p => p.verification?.status !== 'verified');
      console.log('Unverified phone:', unverified);
      if (unverified) {
        await unverified.prepareVerification();
        setShowPhoneVerification(true);
      }
      // Do NOT call handleFormSubmission here; wait for verification
        } catch (error) {
          console.error('Error updating Clerk phone number:', error);
          toast.error('Failed to update phone number in account');
      setShowPhoneConfirmation(false);
      setPendingPhoneUpdate(null);
      setIsPhoneUpdating(false);
    }
  };

  // Handle phone verification
  const handlePhoneVerification = async () => {
    if (!phoneVerificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifyingPhone(true);
    try {
      await user?.reload();
      const unverifiedPhone = user?.phoneNumbers?.find(
        p => p.verification?.status !== 'verified'
      );
      if (!unverifiedPhone) {
        toast.error('No unverified phone found');
        return;
      }
      // Actually verify the phone using Clerk SDK
      await unverifiedPhone.attemptVerification({ code: phoneVerificationCode });

      // Reload user to get updated status
      await user?.reload();
      const verifiedPhone = user?.phoneNumbers?.find(
        p => p.verification?.status === 'verified' && p.id !== user.primaryPhoneNumberId
      );
      if (verifiedPhone) {
        await promotePhone(verifiedPhone.id);
        toast.success('Primary phone updated!');
        
        // Reload user again to get the new primary phone
        await user?.reload();
        
        // Update form data with the new primary phone number
        const newPrimaryPhone = user?.phoneNumbers?.find(p => p.id === user.primaryPhoneNumberId);
        if (newPrimaryPhone) {
          const phoneDigits = newPrimaryPhone.phoneNumber.replace(/\D/g, '').slice(-10);
          setFormData(prev => ({
            ...prev,
            phoneNumber: phoneDigits
          }));
          
          // Update original form data as well
          setOriginalFormData(prev => prev ? {
            ...prev,
            phoneNumber: phoneDigits
          } : null);
          
          // Update Square customer with the new phone number
          if (customer) {
            try {
              const updateData = {
                customerId: customer.id,
                originalReferenceId: customer.referenceId,
                currentPhoneNumber: customer.phoneNumber,
                newPhoneNumber: newPrimaryPhone.phoneNumber,
                userId: user?.id,
                givenName: customer.givenName,
                familyName: customer.familyName,
                emailAddress: customer.emailAddress,
                phoneNumber: phoneDigits,
                address: customer.address,
                billingAddress: customer.address
              };
              
              const result = await updateCustomer(updateData);
              if (result) {
                console.log('Square customer phone number updated successfully');
                // Refresh customer data to get the updated phone number
                await refreshCustomer();
              }
            } catch (error) {
              console.error('Error updating Square customer phone number:', error);
              toast.error('Phone updated in account but failed to update in Square');
            }
          }
        }
      } else {
        if (originalFormData) setFormData(originalFormData);
      }
      setShowPhoneVerification(false);
      setPhoneVerificationCode('');
    } catch (error) {
      console.error('Error verifying phone number:', error);
      
      // Provide specific error messages for common verification errors
      if (error instanceof Error) {
        if (error.message.includes('Incorrect code') || error.message.includes('Invalid code')) {
          toast.error('Incorrect verification code. Please check the code and try again.');
        } else if (error.message.includes('expired') || error.message.includes('Expired')) {
          toast.error('Verification code has expired. Please request a new code.');
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          toast.error('Too many attempts. Please wait a moment before trying again.');
        } else {
          toast.error('Failed to verify phone number. Please try again.');
        }
      } else {
        toast.error('Failed to verify phone number. Please try again.');
      }
      
      if (originalFormData) setFormData(originalFormData);
    } finally {
      setIsVerifyingPhone(false);
      setIsPhoneUpdating(false); // Reset phone updating state as well
    }
  };

  // Handle email verification
  const handleEmailVerification = async () => {
    if (!emailVerificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifyingEmail(true);
    try {
      await user?.reload();
      const unverifiedEmail = user?.emailAddresses?.find(
        e => e.verification?.status !== 'verified'
      );
      if (!unverifiedEmail) {
        toast.error('No unverified email found');
        return;
      }
      // Actually verify the email using Clerk SDK
      await unverifiedEmail.attemptVerification({ code: emailVerificationCode });

      // Reload user to get updated status
      await user?.reload();
      const verifiedEmail = user?.emailAddresses?.find(
        e => e.verification?.status === 'verified' && e.id !== user.primaryEmailAddressId
      );
      if (verifiedEmail) {
        await promoteEmail(verifiedEmail.id);
        toast.success('Primary email updated!');
        
        // Reload user again to get the new primary email
        await user?.reload();
        
        // Update form data with the new primary email address
        const newPrimaryEmail = user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId);
        if (newPrimaryEmail) {
          setFormData(prev => ({
            ...prev,
            email: newPrimaryEmail.emailAddress
          }));
          
          // Update original form data as well
          setOriginalFormData(prev => prev ? {
            ...prev,
            email: newPrimaryEmail.emailAddress
          } : null);
          
          // Update Square customer with the new email address
          if (customer) {
            try {
              const updateData = {
                customerId: customer.id,
                originalReferenceId: customer.referenceId,
                currentPhoneNumber: customer.phoneNumber,
                newPhoneNumber: customer.phoneNumber,
                userId: user?.id,
                givenName: customer.givenName,
                familyName: customer.familyName,
                emailAddress: newPrimaryEmail.emailAddress,
                phoneNumber: customer.phoneNumber?.replace(/\D/g, '').slice(-10) || '',
                address: customer.address,
                billingAddress: customer.address
              };
              
              const result = await updateCustomer(updateData);
              if (result) {
                console.log('Square customer email address updated successfully');
                // Refresh customer data to get the updated email address
                await refreshCustomer();
              }
            } catch (error) {
              console.error('Error updating Square customer email address:', error);
              toast.error('Email updated in account but failed to update in Square');
            }
          }
          
          // Don't call handleFormSubmission here since we've already updated Square
          // and it would override the correct email with the old form data
        }
      } else {
        if (originalFormData) setFormData(originalFormData);
      }
      setShowEmailVerification(false);
      setEmailVerificationCode('');
    } catch (error) {
      console.error('Error verifying email address:', error);
      
      // Provide specific error messages for common verification errors
      if (error instanceof Error) {
        if (error.message.includes('Incorrect code') || error.message.includes('Invalid code')) {
          toast.error('Incorrect verification code. Please check the code and try again.');
        } else if (error.message.includes('expired') || error.message.includes('Expired')) {
          toast.error('Verification code has expired. Please request a new code.');
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          toast.error('Too many attempts. Please wait a moment before trying again.');
        } else {
          toast.error('Failed to verify email address. Please try again.');
        }
      } else {
        toast.error('Failed to verify email address. Please try again.');
      }
      
      if (originalFormData) setFormData(originalFormData);
    } finally {
      setIsVerifyingEmail(false);
      setIsEmailUpdating(false); // Reset email updating state as well
    }
  };

  // Handle email confirmation
  const handleEmailConfirmation = async () => {
    if (!pendingEmailUpdate) return;
    
    setIsEmailUpdating(true);
    try {
      await updateEmailAddress(pendingEmailUpdate);
      console.log('Clerk email address updated successfully');
      setShowEmailConfirmation(false);
      setPendingEmailUpdate(null);

      // Refetch Clerk user to get the new email address
      await user?.reload();

      // Now find the new unverified email and trigger verification
      const unverified = user?.emailAddresses?.find(e => e.verification?.status !== 'verified');
      console.log('Unverified email:', unverified);
      if (unverified) {
        await unverified.prepareVerification({ strategy: 'email_code' });
        setShowEmailVerification(true);
      }
      // Do NOT call handleFormSubmission here; wait for verification
    } catch (error) {
      console.error('Error updating Clerk email address:', error);
      toast.error('Failed to update email address in account');
      setShowEmailConfirmation(false);
      setPendingEmailUpdate(null);
      setIsEmailUpdating(false);
    }
  };

  // Extract the form submission logic into a separate function
  const handleFormSubmission = async () => {
    try {
      // Format phone number to exactly 10 digits, removing country code
      const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
      const formattedPhone = digitsOnly.slice(-10);
      
      // Prepare billing address
      const billingAddress = formData.billingSameAsShipping ? {
        addressLine1: formData.address,
        locality: formData.city,
        postalCode: formData.zipCode,
        administrativeDistrictLevel1: formData.state,
        country: 'US'
      } : {
        addressLine1: formData.billingAddress,
        locality: formData.billingCity,
        postalCode: formData.billingZipCode,
        administrativeDistrictLevel1: formData.billingState,
        country: 'US'
      };

      if (customer) {
        // Update existing customer
      const updateData = {
        customerId: customer.id,
          originalReferenceId: customer.referenceId,
          currentPhoneNumber: customer.phoneNumber,
          newPhoneNumber: `+1${formattedPhone}`,
          userId: user?.id,
        givenName: formData.firstName,
        familyName: formData.lastName,
          emailAddress: formData.email,
          phoneNumber: formattedPhone,
        address: {
            addressLine1: formData.address,
            locality: formData.city,
            postalCode: formData.zipCode,
            administrativeDistrictLevel1: formData.state,
            country: 'US'
          },
          billingAddress: billingAddress
        };

        console.log('About to update existing customer with data:', updateData);

        const result = await updateCustomer(updateData);
        console.log('Update result:', result);

        if (result) {
          toast.success('Profile updated successfully!');
          
          // Update original form data to reflect the saved state
          setOriginalFormData({
          firstName: formData.firstName,
          lastName: formData.lastName,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            city: formData.city,
            zipCode: formData.zipCode,
            state: formData.state,
            billingFirstName: formData.billingFirstName,
            billingLastName: formData.billingLastName,
            billingEmail: formData.billingEmail,
            billingPhoneNumber: formData.billingPhoneNumber,
            billingAddress: formData.billingAddress,
            billingCity: formData.billingCity,
            billingZipCode: formData.billingZipCode,
            billingState: formData.billingState,
            billingSameAsShipping: formData.billingSameAsShipping
          });
          console.log('Updating original form data after successful save');
        }
      } else {
        // Create new customer for new users
        console.log('No existing customer found, creating new customer for new user');
        
        // Create customer with initial data
        const createData = {
          userId: user?.id,
          givenName: formData.firstName,
          familyName: formData.lastName,
          emailAddress: formData.email,
          phoneNumber: `+1${formattedPhone}`,
          address: {
            addressLine1: formData.address,
            locality: formData.city,
            postalCode: formData.zipCode,
            administrativeDistrictLevel1: formData.state,
            country: 'US'
          },
          billingAddress: billingAddress
        };

        console.log('About to create new customer with data:', createData);

        // Use the search API with createIfNotFound to create the customer
        const newCustomer = await fetcherPost<{
          id: string;
          referenceId: string;
          phoneNumber?: string;
          givenName?: string;
          familyName?: string;
          emailAddress?: string;
          address?: {
            addressLine1?: string;
            locality?: string;
            postalCode?: string;
            administrativeDistrictLevel1?: string;
            country?: string;
          };
        }>('/square/customers/search', {
          referenceId: user?.id,
          createIfNotFound: true,
          givenName: formData.firstName,
          familyName: formData.lastName,
          emailAddress: formData.email,
          address: {
            addressLine1: formData.address,
            locality: formData.city,
            postalCode: formData.zipCode,
            administrativeDistrictLevel1: formData.state,
            country: 'US'
          }
        });
        
        console.log('New customer created:', newCustomer);

        if (newCustomer) {
          // Now update the customer with the form data
          const updateData = {
            customerId: newCustomer.id,
            originalReferenceId: newCustomer.referenceId,
            currentPhoneNumber: newCustomer.phoneNumber,
            newPhoneNumber: `+1${formattedPhone}`,
            userId: user?.id,
            givenName: formData.firstName,
            familyName: formData.lastName,
            emailAddress: formData.email,
            phoneNumber: formattedPhone,
            address: {
              addressLine1: formData.address,
              locality: formData.city,
              postalCode: formData.zipCode,
              administrativeDistrictLevel1: formData.state,
              country: 'US'
            },
            billingAddress: billingAddress
          };

          const result = await updateCustomer(updateData);
          if (result) {
            toast.success('Profile created successfully!');
            
            // Update original form data to reflect the saved state
            setOriginalFormData({
            firstName: formData.firstName,
            lastName: formData.lastName,
              email: formData.email,
              phoneNumber: formData.phoneNumber,
              address: formData.address,
              city: formData.city,
              zipCode: formData.zipCode,
              state: formData.state,
              billingFirstName: formData.billingFirstName,
              billingLastName: formData.billingLastName,
              billingEmail: formData.billingEmail,
              billingPhoneNumber: formData.billingPhoneNumber,
              billingAddress: formData.billingAddress,
              billingCity: formData.billingCity,
              billingZipCode: formData.billingZipCode,
              billingState: formData.billingState,
              billingSameAsShipping: formData.billingSameAsShipping
            });
            
            // Refresh customer data to load the new customer
            await refreshCustomer();
          }
        } else {
          throw new Error('Failed to create new customer');
        }
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update profile');
    }
  };

  // Phone number handling strategy:
  // 1. When phone number changes, update Clerk first
  // 2. Then update Square customer with new phone number
  // 3. Refresh customer data to ensure proper linking
  // 4. Handle cases where phone number change might affect customer lookup

  useEffect(() => {
    if (customer) {
      // Get the primary phone number from Clerk user
      const primaryPhoneNumber = user?.phoneNumbers?.find(p => p.id === user.primaryPhoneNumberId);
      const clerkPhoneDigits = primaryPhoneNumber?.phoneNumber?.replace(/\D/g, '').slice(-10) || '';
      
      const loadedData = {
        firstName: customer.givenName || "",
        lastName: customer.familyName || "",
        email: customer.emailAddress || "",
        // Prioritize Clerk's primary phone number over Square customer's phone number
        phoneNumber: clerkPhoneDigits || customer.phoneNumber || "",
        address: customer.address?.addressLine1 || "",
        city: customer.address?.locality || "",
        zipCode: customer.address?.postalCode || "",
        state: customer.address?.administrativeDistrictLevel1 || "",
        billingFirstName: "",
        billingLastName: "",
        billingEmail: "",
        billingPhoneNumber: "",
        billingAddress: "",
        billingCity: "",
        billingZipCode: "",
        billingState: "",
        billingSameAsShipping: true
      };
      
      setFormData(prev => ({ ...prev, ...loadedData }));
      setOriginalFormData(loadedData);
      setReferenceId(customer.referenceId);
    } else {
      console.log('No customer data available. isLoading:', isLoading, 'error:', error);
    }
  }, [customer, user, isLoading, error]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  // Cleanup any accidentally created customers during validation
  useEffect(() => {
    const cleanupValidationCustomers = async () => {
      if (customer && customer.referenceId !== user?.id) {
        console.warn('Detected customer with mismatched reference ID, this might be from validation:', {
          customerId: customer.id,
          customerReferenceId: customer.referenceId,
          userId: user?.id
        });
        
        // Fix the reference ID mismatch by updating the customer
        try {
          console.log('Fixing reference ID mismatch...');
          const updateData = {
            customerId: customer.id,
            originalReferenceId: customer.referenceId,
            currentPhoneNumber: customer.phoneNumber,
            newPhoneNumber: customer.phoneNumber,
            userId: user?.id,
            givenName: customer.givenName,
            familyName: customer.familyName,
            emailAddress: customer.emailAddress,
            phoneNumber: customer.phoneNumber,
            address: customer.address,
            billingAddress: customer.address
          };
          
          const result = await updateCustomer(updateData);
          if (result) {
            console.log('Successfully fixed reference ID mismatch');
            // Refresh customer data to get the updated reference ID
            await refreshCustomer();
          }
    } catch (error) {
          console.error('Failed to fix reference ID mismatch:', error);
        }
      }
    };

    cleanupValidationCustomers();
  }, [customer, user?.id, updateCustomer, refreshCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    // Prevent submission if there's a phone number error
    if (phoneNumberError) {
      toast.error('Please fix the phone number error before saving');
      return;
    }

    // Format phone number to exactly 10 digits, removing country code
    const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
    const formattedPhone = digitsOnly.slice(-10);
    
    // Check for phone number changes
    const currentClerkPhone = user?.phoneNumbers?.[0]?.phoneNumber;
    const newClerkPhone = `+1${formattedPhone}`;
    
    if (currentClerkPhone !== newClerkPhone) {
      // Show confirmation dialog for phone number change
      setPendingPhoneUpdate(newClerkPhone);
      setShowPhoneConfirmation(true);
      return; // Don't proceed with the rest of the update until confirmed
    }

    // Check for email changes
    const currentClerkEmail = user?.emailAddresses?.[0]?.emailAddress;
    const newClerkEmail = formData.email;
    
    if (currentClerkEmail !== newClerkEmail) {
      // Show confirmation dialog for email change
      setPendingEmailUpdate(newClerkEmail);
      setShowEmailConfirmation(true);
      return; // Don't proceed with the rest of the update until confirmed
    }

    // If no phone number or email changes, proceed with normal form submission
    await handleFormSubmission();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      const input = e.target as HTMLInputElement;
      setFormData(prev => ({ 
        ...prev, 
        billingSameAsShipping: input.checked 
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Validate phone number in real-time
    if (name === 'phoneNumber' && value.length === 10) {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length === 10) {
        const formattedPhone = `+1${digitsOnly}`;
        const originalPhone = user?.phoneNumbers?.[0]?.phoneNumber;
        
        console.log('Phone number validation debug:', {
          inputValue: value,
          digitsOnly,
          formattedPhone,
          originalPhone,
          currentCustomerPhone: customer?.phoneNumber,
          currentCustomerId: customer?.id
        });
        
        // Only check if phone number has actually changed
        if (formattedPhone !== originalPhone) {
          // Clear any existing timeout
          if (validationTimeout) {
            clearTimeout(validationTimeout);
          }
          
          // Set a new timeout for validation (debounce)
          const timeout = setTimeout(() => {
            checkPhoneNumberAvailability(formattedPhone, customer?.id).then((isAvailable: boolean) => {
              console.log('Phone availability check completed:', { phoneNumber: formattedPhone, isAvailable });
              if (!isAvailable) {
                setPhoneNumberError('This phone number is already registered to another account');
              } else {
                setPhoneNumberError(null);
              }
            }).catch((error: unknown) => {
              console.error('Phone availability check failed:', error);
              setPhoneNumberError(null); // Clear error if check fails
            });
          }, 500); // 500ms debounce
          
          setValidationTimeout(timeout);
        } else {
          setPhoneNumberError(null);
        }
      }
    } else if (name === 'phoneNumber') {
      // Clear any existing timeout when user is still typing
      if (validationTimeout) {
        clearTimeout(validationTimeout);
        setValidationTimeout(null);
      }
      setPhoneNumberError(null); // Clear error when user is still typing
    }
  };

  // Compare form data to original
  const isFormUnchanged = !originalFormData || (
    formData.firstName === originalFormData.firstName &&
    formData.lastName === originalFormData.lastName &&
    formData.email === originalFormData.email &&
    formData.phoneNumber === originalFormData.phoneNumber &&
    formData.address === originalFormData.address &&
    formData.city === originalFormData.city &&
    formData.zipCode === originalFormData.zipCode &&
    formData.state === originalFormData.state &&
    formData.billingFirstName === originalFormData.billingFirstName &&
    formData.billingLastName === originalFormData.billingLastName &&
    formData.billingEmail === originalFormData.billingEmail &&
    formData.billingPhoneNumber === originalFormData.billingPhoneNumber &&
    formData.billingAddress === originalFormData.billingAddress &&
    formData.billingCity === originalFormData.billingCity &&
    formData.billingZipCode === originalFormData.billingZipCode &&
    formData.billingState === originalFormData.billingState &&
    formData.billingSameAsShipping === originalFormData.billingSameAsShipping
  );

  // Only log form state changes when they actually change
  useEffect(() => {
    if (originalFormData) {
      const hasChanged = !isFormUnchanged;
      if (hasChanged) {
        console.log('Form state changed:', {
          isFormUnchanged,
          phoneNumberChanged: formData.phoneNumber !== originalFormData.phoneNumber,
          currentPhone: formData.phoneNumber,
          originalPhone: originalFormData.phoneNumber
        });
      }
    }
  }, [isFormUnchanged, formData.phoneNumber, originalFormData?.phoneNumber]);

  // Resend email verification code
  const resendEmailVerification = async () => {
    try {
      const unverified = user?.emailAddresses?.find(e => e.verification?.status !== 'verified');
      if (!unverified) throw new Error('No unverified email found');
      await unverified.prepareVerification({ strategy: 'email_code' });
      toast.success('Verification code resent!');
    } catch (_err) {
      toast.error('Failed to resend code');
    }
  };

  // Resend phone verification code
  const resendPhoneVerification = async () => {
    try {
      const unverified = user?.phoneNumbers?.find(p => p.verification?.status !== 'verified');
      if (!unverified) throw new Error('No unverified phone found');
      await unverified.prepareVerification();
      toast.success('Verification code resent!');
    } catch (_err) {
      toast.error('Failed to resend code');
    }
  };

  // Merge guest cart on sign-in
  useEffect(() => {
    const mergeGuestCart = async () => {
      const guestCartId = localStorage.getItem('guestCartId');
      if (guestCartId && user?.id) {
        try {
          await mergeCart(guestCartId, user.id);
          localStorage.removeItem('guestCartId');
          // Optionally, refresh cart context/state here
        } catch (err) {
          console.error('Error merging guest cart:', err);
        }
      }
    };
    mergeGuestCart();
  }, [user?.id, mergeCart]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-[#E6B325] flex items-center justify-center">
        <p className="text-lg">Please sign in to view your profile.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-[#E6B325] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E6B325] mx-auto mb-4"></div>
          <p className="text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-[#E6B325] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-400 mb-4">Failed to load profile data</p>
          <button 
            onClick={() => refreshCustomer()}
            className="px-4 py-2 bg-[#E6B325] text-black rounded-md hover:bg-[#E6B325]/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!customer && !isLoading && !error) {
    return (
      <div className="min-h-screen bg-black text-[#E6B325] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">No customer profile found</p>
          <p className="text-sm text-gray-400 mb-6">
            This might happen if you haven&apos;t made any purchases yet or if your profile hasn&apos;t been created.
          </p>
          <button 
            onClick={() => refreshCustomer()}
            className="px-4 py-2 bg-[#E6B325] text-black rounded-md hover:bg-[#E6B325]/90"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#E6B325] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-black/50 backdrop-blur-sm border border-[#E6B325]/30 rounded-lg p-8"
        >
          <h1 className="text-3xl font-bold mb-8 text-center">Edit Profile</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
              />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {user?.emailAddresses?.[0]?.verification?.status === 'verified' ? (
                    <div title="Email verified">
                      <ShieldCheck className="text-green-500" size={18} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowEmailVerification(true)}
                      className="text-[#E6B325] hover:text-white text-sm font-medium"
                      title="Verify email address"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <div className="relative">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-md bg-black border text-[#E6B325] focus:ring-0 ${
                    phoneNumberError 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-[#E6B325]/30 focus:border-[#E6B325]'
                  }`}
                  disabled={isPhoneUpdating}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isPhoneUpdating && (
                    <div className="text-[#E6B325] text-sm">
                      Updating...
                    </div>
                  )}
                  {user?.phoneNumbers?.[0]?.verification?.status === 'verified' ? (
                    <div title="Phone verified">
                      <ShieldCheck className="text-green-500" size={18} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const unverified = user?.phoneNumbers?.find(p => p.verification?.status !== 'verified');
                          if (!unverified) {
                            toast.error('No unverified phone found');
                            return;
                          }
                          await unverified.prepareVerification();
                          setShowPhoneVerification(true);
                          toast.success('Verification code sent!');
                        } catch (error) {
                          console.error('Error preparing phone verification:', error);
                          toast.error('Failed to send verification code');
                        }
                      }}
                      className="text-[#E6B325] hover:text-white text-sm font-medium"
                      title="Verify phone number"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
              {phoneNumberError && (
                <div className="mt-1 text-red-500 text-sm">
                  {phoneNumberError}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reference ID</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  name="referenceId"
                  value={referenceId || ''}
                  readOnly
                  className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] opacity-60 focus:border-[#E6B325] focus:ring-0 select-all pr-10"
                  style={{ cursor: 'default' }}
                  tabIndex={-1}
                  aria-readonly="true"
                />
                {referenceId && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#E6B325] hover:text-white focus:outline-none"
                    aria-label="Copy Reference ID"
                    onClick={() => {
                      navigator.clipboard.writeText(referenceId);
                    }}
                  >
                    <Copy size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Address</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                />
              </div>
            </div>

            {/* Shipping state */}
            <div>
              <label className="block text-sm font-medium mb-2">State *</label>
              <StateDropdown
                value={formData.state}
                onChange={val => handleInputChange({
                  target: { name: 'state', value: val, type: 'text' } as HTMLInputElement
                } as React.ChangeEvent<HTMLInputElement>)}
                name="state"
              />
            </div>

            {/* Billing same as shipping checkbox */}
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="billingSameAsShipping"
                name="billingSameAsShipping"
                checked={formData.billingSameAsShipping}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="billingSameAsShipping" className="text-[#E6B325] select-none cursor-pointer">
                Billing address same as shipping
              </label>
            </div>

            {/* Billing address fields */}
            {!formData.billingSameAsShipping && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-[#E6B325] mb-2">Billing Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <input
                      type="text"
                      name="billingFirstName"
                      value={formData.billingFirstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
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
                      className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
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
                      className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
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
                      className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
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
                    className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
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
                      className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      name="billingZipCode"
                      value={formData.billingZipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-[#E6B325] text-black font-medium rounded-md hover:bg-[#E6B325]/90 focus:outline-none focus:ring-2 focus:ring-[#E6B325] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUpdating || isFormUnchanged || isLoading || isPhoneUpdating || isEmailUpdating}
              >
                {isUpdating || isPhoneUpdating || isEmailUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Phone Number Confirmation Dialog */}
      {showPhoneConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-[#E6B325]/30 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#E6B325] mb-4">Confirm Phone Number Change</h3>
            <p className="text-white mb-4">
              You are about to change your phone number from{' '}
              <span className="text-[#E6B325]">{user?.phoneNumbers?.[0]?.phoneNumber}</span> to{' '}
              <span className="text-[#E6B325]">{pendingPhoneUpdate}</span>.
            </p>
            <p className="text-white mb-6">
              This will require additional verification. Are you sure you want to continue?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPhoneConfirmation(false);
                  setPendingPhoneUpdate(null);
                }}
                className="flex-1 px-4 py-2 border border-[#E6B325]/30 text-[#E6B325] rounded-md hover:bg-[#E6B325]/10"
                disabled={isPhoneUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handlePhoneNumberConfirmation}
                className="flex-1 px-4 py-2 bg-[#E6B325] text-black font-medium rounded-md hover:bg-[#E6B325]/90 disabled:opacity-50"
                disabled={isPhoneUpdating}
              >
                {isPhoneUpdating ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Dialog */}
      {showEmailConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-[#E6B325]/30 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#E6B325] mb-4">Confirm Email Address Change</h3>
            <p className="text-white mb-4">
              You are about to change your email address from{' '}
              <span className="text-[#E6B325]">{user?.emailAddresses?.[0]?.emailAddress}</span> to{' '}
              <span className="text-[#E6B325]">{pendingEmailUpdate}</span>.
            </p>
            <p className="text-white mb-6">
              This will require additional verification. Are you sure you want to continue?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowEmailConfirmation(false);
                  setPendingEmailUpdate(null);
                }}
                className="flex-1 px-4 py-2 border border-[#E6B325]/30 text-[#E6B325] rounded-md hover:bg-[#E6B325]/10"
                disabled={isEmailUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailConfirmation}
                className="flex-1 px-4 py-2 bg-[#E6B325] text-black font-medium rounded-md hover:bg-[#E6B325]/90 disabled:opacity-50"
                disabled={isEmailUpdating}
              >
                {isEmailUpdating ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Verification Dialog */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-[#E6B325]/30 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#E6B325] mb-4">Verify Phone Number</h3>
            <p className="text-white mb-4">
              Enter the verification code sent to{' '}
              <span className="text-[#E6B325]">{user?.phoneNumbers?.[0]?.phoneNumber}</span>
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={phoneVerificationCode}
                onChange={(e) => setPhoneVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                maxLength={6}
              />
            </div>
            <div className="flex gap-4 mb-2">
              <button
                onClick={() => {
                  setShowPhoneVerification(false);
                  setPhoneVerificationCode('');
                }}
                className="flex-1 px-4 py-2 border border-[#E6B325]/30 text-[#E6B325] rounded-md hover:bg-[#E6B325]/10"
                disabled={isVerifyingPhone}
              >
                Cancel
              </button>
              <button
                onClick={handlePhoneVerification}
                className="flex-1 px-4 py-2 bg-[#E6B325] text-black font-medium rounded-md hover:bg-[#E6B325]/90 disabled:opacity-50"
                disabled={isVerifyingPhone}
              >
                {isVerifyingPhone ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <button
              type="button"
              onClick={resendPhoneVerification}
              className="w-full text-[#E6B325] hover:text-white text-sm font-medium mt-2"
              disabled={isVerifyingPhone}
            >
              Resend code
            </button>
          </div>
        </div>
      )}

      {/* Email Verification Dialog */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-[#E6B325]/30 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#E6B325] mb-4">Verify Email Address</h3>
            <p className="text-white mb-4">
              Enter the verification code sent to{' '}
              <span className="text-[#E6B325]">{user?.emailAddresses?.[0]?.emailAddress}</span>
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={emailVerificationCode}
                onChange={(e) => setEmailVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                className="w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0"
                maxLength={6}
              />
            </div>
            <div className="flex gap-4 mb-2">
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setEmailVerificationCode('');
                }}
                className="flex-1 px-4 py-2 border border-[#E6B325]/30 text-[#E6B325] rounded-md hover:bg-[#E6B325]/10"
                disabled={isVerifyingEmail}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailVerification}
                className="flex-1 px-4 py-2 bg-[#E6B325] text-black font-medium rounded-md hover:bg-[#E6B325]/90 disabled:opacity-50"
                disabled={isVerifyingEmail}
              >
                {isVerifyingEmail ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <button
              type="button"
              onClick={resendEmailVerification}
              className="w-full text-[#E6B325] hover:text-white text-sm font-medium mt-2"
              disabled={isVerifyingEmail}
            >
              Resend code
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 