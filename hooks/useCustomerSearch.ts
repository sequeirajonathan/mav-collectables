import { fetcherPost } from '@lib/swr';

interface CustomerSearchRequest {
  emailAddress?: string;
  phoneNumber?: string;
  createIfNotFound?: boolean;
}

interface CustomerSearchResponse {
  exists: boolean;
  customers: Array<{
    id: string;
    emailAddress: string;
    phoneNumber: string;
    givenName: string;
    familyName: string;
  }>;
}

export function useCustomerSearch() {
  const searchCustomer = async (searchParams: CustomerSearchRequest): Promise<CustomerSearchResponse> => {
    try {
      const result = await fetcherPost<CustomerSearchResponse, CustomerSearchRequest>(
        '/search-square-customer',
        searchParams
      );
      return result;
    } catch (error) {
      console.error('Customer search failed:', error);
      throw error;
    }
  };

  return {
    searchCustomer,
  };
} 