import useSWR from 'swr';
import { fetcherPost } from '@lib/swr';
import { SquareCustomer } from '@interfaces/square';
import { toast } from 'react-hot-toast';

export function useSearchSquareCustomer(searchKey?: string) {
  // If searchKey is a phone number, convert to E.164 format
  // If searchKey is a user ID, use it as reference ID
  const isPhoneNumber = searchKey && /^\d{10}$/.test(searchKey);
  const e164Phone = isPhoneNumber ? `+1${searchKey}` : undefined;
  const referenceId = !isPhoneNumber ? searchKey : undefined;

  // Prioritize reference ID search over phone number search to prevent creating new customers
  const searchParams = referenceId 
    ? { referenceId, createIfNotFound: true }
    : { phoneNumber: e164Phone, createIfNotFound: true };

  const { data, error, isLoading, mutate } = useSWR<SquareCustomer>(
    searchKey ? '/square/customers/search' : null,
    (url) => fetcherPost(url, searchParams),
    {
      onError: (error) => {
        console.error('Failed to fetch customer:', error);
        toast.error('Failed to load customer information');
      }
    }
  );

  // Function to check if a phone number is available (not used by another customer)
  const checkPhoneNumberAvailability = async (phoneNumber: string, currentCustomerId?: string): Promise<boolean> => {
    try {
      console.log('Checking phone number availability:', { phoneNumber, currentCustomerId });
      
      const result = await fetcherPost<{ customer?: { id: string } }>('/square/customers/search', {
        phoneNumber,
        createIfNotFound: false
      });

      console.log('Phone availability check response:', result);

      const existingCustomer = result.customer;
      // Phone number is available if no customer found OR if it belongs to the current customer
      const isAvailable = !existingCustomer?.id || existingCustomer.id === currentCustomerId;
      console.log('Phone number availability result:', { isAvailable, existingCustomerId: existingCustomer?.id, currentCustomerId });
      return isAvailable;
    } catch (error) {
      console.error('Error checking phone number availability:', error);
      return true; // Assume available if check fails
    }
  };

  return {
    customer: data,
    isLoading,
    error,
    mutate,
    checkPhoneNumberAvailability
  };
} 