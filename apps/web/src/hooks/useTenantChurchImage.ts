'use client';

import { useState, useEffect } from 'react';

interface TenantChurchImageResult {
  url: string | null;
  tenantName: string | null;
  isLoading: boolean;
}

interface ChurchImageApiResponse {
  url: string | null;
  tenantName: string | null;
}

// Cache the result to avoid multiple API calls
let cachedResult: ChurchImageApiResponse | null = null;
let fetchPromise: Promise<ChurchImageApiResponse> | null = null;

async function fetchChurchImage(): Promise<ChurchImageApiResponse> {
  // Return cached result if available
  if (cachedResult) {
    return cachedResult;
  }

  // If there's already a fetch in progress, wait for it
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start the fetch
  fetchPromise = fetch('/api/tenant/church-image', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        return { url: null, tenantName: null };
      }
      const result = await response.json();
      cachedResult = result;
      return result;
    })
    .catch(() => {
      return { url: null, tenantName: null };
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

/**
 * Hook to get the tenant's church image URL.
 * Results are cached to avoid multiple API calls.
 */
export function useTenantChurchImage(): TenantChurchImageResult {
  const [result, setResult] = useState<ChurchImageApiResponse>({
    url: cachedResult?.url ?? null,
    tenantName: cachedResult?.tenantName ?? null,
  });
  const [isLoading, setIsLoading] = useState(!cachedResult);

  useEffect(() => {
    // If we have a cached result, use it
    if (cachedResult) {
      setResult(cachedResult);
      setIsLoading(false);
      return;
    }

    // Otherwise fetch it
    fetchChurchImage().then((data) => {
      setResult(data);
      setIsLoading(false);
    });
  }, []);

  return {
    url: result.url,
    tenantName: result.tenantName,
    isLoading,
  };
}

/**
 * Clear the cached church image (call after upload/delete)
 */
export function clearTenantChurchImageCache() {
  cachedResult = null;
}
