// src/hooks/useNotification.js
import { useState, useEffect, useCallback } from 'react';

export const useNotification = (duration = 3000) => {
  const [notification, setNotification] = useState({
    message: '',
    type: '', // 'success' | 'error'
  });

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: '', type: '' });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification.message, duration]);

  const showSuccess = useCallback((message) => {
    setNotification({ message, type: 'success' });
  }, []);

  const showError = useCallback((message) => {
    setNotification({ message, type: 'error' });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification({ message: '', type: '' });
  }, []);

  return {
    notification,
    showSuccess,
    showError,
    clearNotification,
  };
};
