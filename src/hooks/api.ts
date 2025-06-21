'use client';

import { useAuth } from '@/src/context/AuthContext';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Generic type for API response data
type ApiResponse<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// Hook for GET requests
export function useApiGet<T>(url: string, initialFetch: boolean = true): ApiResponse<T> {
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(initialFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        logout();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred while fetching data.');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [url, token, logout]);

  useEffect(() => {
    if (initialFetch && token) {
      fetchData();
    }
  }, [initialFetch, fetchData, token]);

  return { data, isLoading, error, refetch: fetchData };
}

// Hook for POST requests
export function useApiPost<T, U = any>(url: string) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<U | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const postData = async (payload: T): Promise<U | null> => {
    if (!token) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        logout();
        return null;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred while submitting data.');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { postData, data, isLoading, error };
}

// Hook for PUT requests
export function useApiPut<T, U = any>(url: string) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<U | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const putData = async (payload: T): Promise<U | null> => {
    if (!token) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        logout();
        return null;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred while updating data.');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { putData, data, isLoading, error };
}

// Hook for PATCH requests
export function useApiPatch<T, U = any>(url: string) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<U | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const patchData = async (payload: T): Promise<U | null> => {
    if (!token) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        logout();
        return null;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred while updating data.');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { patchData, data, isLoading, error };
}

// Hook for DELETE requests
export function useApiDelete<T = any>(url: string) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteData = async (): Promise<T | null> => {
    if (!token) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        logout();
        return null;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred while deleting data.');
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteData, data, isLoading, error };
}
