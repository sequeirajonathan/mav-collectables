"use client";

import { SWRConfiguration } from "swr";
import useSWR, { mutate } from "swr";
import { axiosClient } from "./axios";
import { AxiosError } from "axios";

class ResourceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ResourceError";
  }
}

// Type guard to check if a value is an array
const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);

// Type guard to check if a value is an object
const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Type for API response that might wrap data
interface ApiResponse<T> {
  data: T;
  [key: string]: unknown;
}

// Enhanced fetcher with better error handling, timeout, and type checking
const fetcher = async <T = unknown>(url: string): Promise<T> => {
  try {
    const response = await axiosClient.get<unknown>(url, {
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    const data = response.data;

    // Handle different response types
    if (isArray<T>(data)) {
      return data as unknown as T;
    } else if (isObject(data)) {
      if ('data' in data) {
        const responseData = (data as ApiResponse<T>).data;
        console.log('Found data property:', responseData);
        if (isArray<T>(responseData)) {
          return responseData as unknown as T;
        }
        return responseData as T;
      }
      return data as T;
    } else {
      console.error('Unexpected data type:', typeof data, data);
      throw new ResourceError(
        "Unexpected response format",
        500,
        "INVALID_FORMAT",
        { received: typeof data, data }
      );
    }
  } catch (error) {
    // Only log real errors, not canceled/aborted requests
    if (error instanceof ResourceError) {
      throw error;
    }
    if (error instanceof AxiosError) {
      // Handle request cancellation gracefully
      if (error.code === "ERR_CANCELED" || error.message === "canceled") {
        return undefined as unknown as T;
      }
      if (error.code === "ECONNABORTED") {
        throw new ResourceError("Request timed out", 408, "TIMEOUT");
      }
      if (error.response) {
        throw new ResourceError(
          error.response.data?.message || "Request failed",
          error.response.status,
          error.code,
          error.response.data
        );
      }
      if (error.request) {
        throw new ResourceError("No response received", 0, "NO_RESPONSE");
      }
    }
    if (error instanceof Error) {
      // Handle AbortError gracefully
      if (error.name === "AbortError" || error.message === "canceled") {
        return undefined as unknown as T;
      }
      throw new ResourceError(error.message, 500, "UNKNOWN_ERROR");
    }
    throw new ResourceError("Unknown error occurred", 500, "UNKNOWN_ERROR", error);
  }
};

// Enhanced POST fetcher with type checking
const fetcherPost = async <TResponse = unknown, TRequest = unknown>(
  url: string,
  body: TRequest
): Promise<TResponse> => {
  try {
    const response = await axiosClient.post<unknown>(url, body, {
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    const data = response.data;

    // Handle different response types
    if (isArray<TResponse>(data)) {
      return data as unknown as TResponse;
    } else if (isObject(data)) {
      // If we expect an object, validate it has the expected shape
      if ('data' in data && isArray<TResponse>((data as ApiResponse<TResponse[]>).data)) {
        return (data as ApiResponse<TResponse[]>).data as unknown as TResponse;
      }
      return data as TResponse;
    } else {
      throw new ResourceError(
        "Unexpected response format",
        500,
        "INVALID_FORMAT",
        { received: typeof data, data }
      );
    }
  } catch (error) {
    if (error instanceof ResourceError) {
      throw error;
    }
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        throw new ResourceError("Request timed out", 408, "TIMEOUT");
      }
      if (error.response) {
        throw new ResourceError(
          error.response.data?.message || "Request failed",
          error.response.status,
          error.code,
          error.response.data
        );
      }
      if (error.request) {
        throw new ResourceError("No response received", 0, "NO_RESPONSE");
      }
    }
    if (error instanceof Error) {
      throw new ResourceError(error.message, 500, "UNKNOWN_ERROR");
    }
    throw new ResourceError("Unknown error occurred", 500, "UNKNOWN_ERROR", error);
  }
};

// Enhanced PUT fetcher with type checking
const fetcherPut = async <TResponse = unknown, TRequest = unknown>(
  url: string,
  body: TRequest
): Promise<TResponse> => {
  try {
    const response = await axiosClient.put<unknown>(url, body, {
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    const data = response.data;

    // Handle different response types
    if (isArray<TResponse>(data)) {
      return data as unknown as TResponse;
    } else if (isObject(data)) {
      // If we expect an object, validate it has the expected shape
      if ('data' in data && isArray<TResponse>((data as ApiResponse<TResponse[]>).data)) {
        return (data as ApiResponse<TResponse[]>).data as unknown as TResponse;
      }
      return data as TResponse;
    } else {
      throw new ResourceError(
        "Unexpected response format",
        500,
        "INVALID_FORMAT",
        { received: typeof data, data }
      );
    }
  } catch (error) {
    if (error instanceof ResourceError) {
      throw error;
    }
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        throw new ResourceError("Request timed out", 408, "TIMEOUT");
      }
      if (error.response) {
        throw new ResourceError(
          error.response.data?.message || "Request failed",
          error.response.status,
          error.code,
          error.response.data
        );
      }
      if (error.request) {
        throw new ResourceError("No response received", 0, "NO_RESPONSE");
      }
    }
    if (error instanceof Error) {
      throw new ResourceError(error.message, 500, "UNKNOWN_ERROR");
    }
    throw new ResourceError("Unknown error occurred", 500, "UNKNOWN_ERROR", error);
  }
};

// Enhanced PATCH fetcher with type checking
const fetcherPatch = async <TResponse = unknown, TRequest = unknown>(
  url: string,
  body: TRequest
): Promise<TResponse> => {
  try {
    const response = await axiosClient.patch<unknown>(url, body, {
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    const data = response.data;

    // Handle different response types
    if (isArray<TResponse>(data)) {
      return data as unknown as TResponse;
    } else if (isObject(data)) {
      // If we expect an object, validate it has the expected shape
      if ('data' in data && isArray<TResponse>((data as ApiResponse<TResponse[]>).data)) {
        return (data as ApiResponse<TResponse[]>).data as unknown as TResponse;
      }
      return data as TResponse;
    } else {
      throw new ResourceError(
        "Unexpected response format",
        500,
        "INVALID_FORMAT",
        { received: typeof data, data }
      );
    }
  } catch (error) {
    if (error instanceof ResourceError) {
      throw error;
    }
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        throw new ResourceError("Request timed out", 408, "TIMEOUT");
      }
      if (error.response) {
        throw new ResourceError(
          error.response.data?.message || "Request failed",
          error.response.status,
          error.code,
          error.response.data
        );
      }
      if (error.request) {
        throw new ResourceError("No response received", 0, "NO_RESPONSE");
      }
    }
    if (error instanceof Error) {
      throw new ResourceError(error.message, 500, "UNKNOWN_ERROR");
    }
    throw new ResourceError("Unknown error occurred", 500, "UNKNOWN_ERROR", error);
  }
};

// Enhanced SWR configuration
const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: 2000,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  onError: (error, _key, _config) => {
    console.error("SWR caught error:", error);
  },
};

// Enhanced resource options type
type ResourceOptions<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: ResourceError) => void;
  fallbackData?: T;
  timeout?: number;
  retryCount?: number;
  retryInterval?: number;
};

// Enhanced useResource hook
export function useResource<TResponse = unknown, TRequest = unknown>(
  baseUrl: string,
  options?: ResourceOptions<TResponse>
) {
  const timeout = options?.timeout ?? 10000;
  const retryCount = options?.retryCount ?? 3;
  const retryInterval = options?.retryInterval ?? 5000;

  const {
    data,
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<TResponse>(baseUrl, () => fetcher<TResponse>(baseUrl), {
    ...swrConfig,
    fallbackData: options?.fallbackData,
    errorRetryCount: retryCount,
    errorRetryInterval: retryInterval,
    onError: (error, key, config) => {
      console.error("SWR caught error:", error);
      swrConfig.onError?.(error, key, config);
      // Enhanced error handling
      let resourceError: ResourceError;
      if (error instanceof ResourceError) {
        resourceError = error;
      } else if (error instanceof AxiosError) {
        resourceError = new ResourceError(
          error.response?.data?.message || error.message || "Request failed",
          error.response?.status,
          error.code,
          error.response?.data
        );
      } else if (error instanceof Error) {
        resourceError = new ResourceError(
          error.message,
          500,
          "UNKNOWN_ERROR",
          { originalError: error }
        );
      } else {
        resourceError = new ResourceError(
          "An unexpected error occurred",
          500,
          "UNKNOWN_ERROR",
          { originalError: error }
        );
      }
      console.error("Resource error created:", resourceError);
      options?.onError?.(resourceError);
    },
  });

  const create = async (data: TRequest) => {
    try {
      const response = await axiosClient.post<TResponse>(baseUrl, data, {
        timeout,
        signal: AbortSignal.timeout(timeout),
      });
      await mutate(baseUrl);
      options?.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof AxiosError
        ? new ResourceError(
            err.response?.data?.message || "Failed to create resource",
            err.response?.status,
            err.code,
            err.response?.data
          )
        : err instanceof Error
        ? new ResourceError(err.message, 500, "UNKNOWN_ERROR", { originalError: err })
        : new ResourceError("Failed to create resource", 500, "UNKNOWN_ERROR");
      options?.onError?.(error);
      throw error;
    }
  };

  const update = async (id: string, data: Partial<TRequest>) => {
    try {
      const response = await axiosClient.patch<TResponse>(
        `${baseUrl}/${id}`,
        data,
        {
          timeout,
          signal: AbortSignal.timeout(timeout),
        }
      );
      await mutate(baseUrl);
      options?.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof AxiosError
        ? new ResourceError(
            err.response?.data?.message || "Failed to update resource",
            err.response?.status,
            err.code,
            err.response?.data
          )
        : err instanceof Error
        ? new ResourceError(err.message, 500, "UNKNOWN_ERROR", { originalError: err })
        : new ResourceError("Failed to update resource", 500, "UNKNOWN_ERROR");
      options?.onError?.(error);
      throw error;
    }
  };

  const remove = async (id: string) => {
    try {
      const response = await axiosClient.delete<TResponse>(`${baseUrl}/${id}`, {
        timeout,
        signal: AbortSignal.timeout(timeout),
      });
      await mutate(baseUrl);
      options?.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof AxiosError
        ? new ResourceError(
            err.response?.data?.message || "Failed to delete resource",
            err.response?.status,
            err.code,
            err.response?.data
          )
        : err instanceof Error
        ? new ResourceError(err.message, 500, "UNKNOWN_ERROR", { originalError: err })
        : new ResourceError("Failed to delete resource", 500, "UNKNOWN_ERROR");
      options?.onError?.(error);
      throw error;
    }
  };

  const getOne = async (id: string) => {
    try {
      const response = await axiosClient.get<TResponse>(`${baseUrl}/${id}`, {
        timeout,
        signal: AbortSignal.timeout(timeout),
      });
      return response.data;
    } catch (err) {
      const error = err instanceof AxiosError
        ? new ResourceError(
            err.response?.data?.message || "Failed to fetch resource",
            err.response?.status,
            err.code,
            err.response?.data
          )
        : err instanceof Error
        ? new ResourceError(err.message, 500, "UNKNOWN_ERROR", { originalError: err })
        : new ResourceError("Failed to fetch resource", 500, "UNKNOWN_ERROR");
      options?.onError?.(error);
      throw error;
    }
  };

  return {
    data,
    error: error 
      ? (error instanceof ResourceError
          ? error
          : error instanceof Error
          ? new ResourceError(error.message, 500, "UNKNOWN_ERROR", { originalError: error })
          : new ResourceError("An unexpected error occurred", 500, "UNKNOWN_ERROR"))
      : undefined,
    isLoading,
    create,
    update,
    remove,
    getOne,
    refresh,
  };
}

export { fetcher, fetcherPost, fetcherPut, fetcherPatch, swrConfig };
