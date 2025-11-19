// src/hooks/useLocationData.js
import { useMutation } from '@tanstack/react-query';
import { getApiUrl, fetchWithTimeout, API_CONFIG } from '../config/api';

export const useFetchLocations = () => {
  return useMutation({
    mutationFn: async (urlOrUrls) => {
      // Determine if single URL or array
      const payload = Array.isArray(urlOrUrls) 
        ? { urls: urlOrUrls } 
        : { url: urlOrUrls };

      const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.CRAWL);
      const res = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg = json.error?.message || json.error || json.message || 'Failed to fetch data';
        throw new Error(errorMsg);
      }

      // Backend returns { success: true, data: [...] }
      // Extract the data array
      const data = json.data || json;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array');
      }

      return data;
    },
    retry: 1,
    retryDelay: 1000,
  });
};
