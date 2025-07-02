import { toast } from 'react-hot-toast';
import { fetcherPut } from '@lib/swr';
import useSWRMutation from 'swr/mutation';
import { UpdateSquareCustomerData } from '@interfaces/square';
import { AxiosError } from 'axios';

async function updateCustomer(url: string, { arg }: { arg: UpdateSquareCustomerData }) {
  try {
    const response = await fetcherPut(url, arg);
    return response;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Update customer error:', error.response?.data || error.message);
    } else {
      console.error('Update customer error:', error);
    }
    throw error;
  }
}

export function useUpdateSquareCustomer() {
  const { trigger, isMutating, error } = useSWRMutation(
    '/square/customers/update',
    updateCustomer,
    {
      onSuccess: (data) => {
        // Only show success toast if it's not an address suggestion
        if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'address_suggestion') {
          toast.success('Customer information updated successfully');
        }
      },
      onError: (error) => {
        if (error instanceof AxiosError) {
          console.error('Error updating customer:', error.response?.data || error.message);
          
          // Handle phone number conflict specifically
          if (error.response?.status === 409) {
            toast.error('This phone number is already registered to another account. Please use a different number.');
          } else {
            toast.error(error.response?.data?.error || 'Failed to update customer information');
          }
        } else {
          console.error('Error updating customer:', error);
          toast.error('Failed to update customer information');
        }
      }
    }
  );

  return {
    updateCustomer: trigger,
    isUpdating: isMutating,
    error
  };
} 