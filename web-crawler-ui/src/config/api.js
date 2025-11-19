// src/config/api.js

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  ENDPOINTS: {
    CRAWL: '/api/crawl',
    LOCATIONS: '/api/crawl/locations',
    PROGRESS: '/api/progress',
  },
  TIMEOUT: 30000, // 30 seconds
};

// Helper function to build full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Fetch with timeout
export const fetchWithTimeout = async (url, options = {}, timeout = API_CONFIG.TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
};
