import { useCallback } from 'react';
import { UserRole } from '@interfaces/roles';
import { fetcherPost } from '@lib/swr';
import useSWR from 'swr';

interface UserMetadataResponse {
  success: boolean;
  username: string;
  role: UserRole;
  error?: string;
}

interface UserMetadataRequest {
  userId: string;
  role: UserRole;
}

export function useUserMetadata(userId: string) {
  const { data, error, mutate } = useSWR<UserMetadataResponse>(
    userId ? ['user/metadata', userId] : null,
    ([_url, _userId]: [string, string]) => fetcherPost<UserMetadataResponse, UserMetadataRequest>('user/metadata', { userId, role: UserRole.USER })
  );

  const setUserRole = useCallback(async (role: UserRole): Promise<UserMetadataResponse> => {
    try {
      const response = await fetcherPost<UserMetadataResponse, UserMetadataRequest>('user/metadata', { userId, role });
      await mutate();
      return response;
    } catch (error) {
      console.error('Error setting user role:', error);
      throw error;
    }
  }, [mutate, userId]);

  return {
    setUserRole,
    data,
    error
  };
} 