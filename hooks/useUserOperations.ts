import { fetcherPost } from '@lib/swr';

interface UpdatePhoneRequest {
  newPhoneNumber: string;
}

interface UpdateEmailRequest {
  newEmailAddress: string;
}

interface PromotePhoneRequest {
  phoneId: string;
}

interface PromoteEmailRequest {
  emailId: string;
}

export function useUserOperations() {
  const updatePhone = async (newPhone: string) => {
    try {
      const result = await fetcherPost<{ success: boolean }>('/user/update-phone', {
        newPhoneNumber: newPhone
      });
      return result;
    } catch (error) {
      console.error('Failed to update phone:', error);
      throw error;
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const result = await fetcherPost<{ success: boolean }>('/user/update-email', {
        newEmailAddress: newEmail
      });
      return result;
    } catch (error) {
      console.error('Failed to update email:', error);
      throw error;
    }
  };

  const promotePhone = async (phoneId: string) => {
    try {
      const result = await fetcherPost<{ success: boolean }>('/user/promote-phone', {
        phoneId
      });
      return result;
    } catch (error) {
      console.error('Failed to promote phone:', error);
      throw error;
    }
  };

  const promoteEmail = async (emailId: string) => {
    try {
      const result = await fetcherPost<{ success: boolean }>('/user/promote-email', {
        emailId
      });
      return result;
    } catch (error) {
      console.error('Failed to promote email:', error);
      throw error;
    }
  };

  return {
    updatePhone,
    updateEmail,
    promotePhone,
    promoteEmail,
  };
} 