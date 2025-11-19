// src/context/AppContext.jsx
import { createContext, useContext, useState } from 'react';
import { mockLocations } from '../mock/mockData';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [useMockData, setUseMockData] = useState(false);
  const [filteredMockData, setFilteredMockData] = useState(mockLocations);
  const [apiData, setApiData] = useState([]);
  const [url, setUrl] = useState('');

  // Get active data based on mode
  const activeData = useMockData ? filteredMockData : apiData;

  // Get all unique URLs for autocomplete
  const allUrls = Array.from(
    new Set(activeData.map(location => location.sourceUrl).filter(Boolean))
  );

  // Toggle between mock and API data
  const toggleDataSource = () => {
    setUseMockData(prev => !prev);
    if (!useMockData) {
      // Switching back to mock - reset filter
      setFilteredMockData(mockLocations);
    }
  };

  // Filter mock data by URL
  const filterMockData = (searchUrl) => {
    if (!searchUrl.trim()) {
      setFilteredMockData(mockLocations);
      return mockLocations.length;
    }

    const filtered = mockLocations.filter(
      location => 
        location.sourceUrl && 
        location.sourceUrl.toLowerCase().includes(searchUrl.toLowerCase())
    );
    
    setFilteredMockData(filtered);
    return filtered.length;
  };

  // Reset mock data filter
  const resetMockFilter = () => {
    setFilteredMockData(mockLocations);
    setUrl('');
  };

  // Clear API data and switch to mock
  const clearApiData = () => {
    setApiData([]);
    setUrl('');
    setUseMockData(true);
    setFilteredMockData(mockLocations);
  };

  // Set API data and switch to API mode
  const setApiDataAndSwitch = (data) => {
    setApiData(data);
    setUseMockData(false);
  };

  const value = {
    // State
    useMockData,
    activeData,
    filteredMockData,
    apiData,
    url,
    allUrls,
    mockLocations,
    
    // Setters
    setUrl,
    setUseMockData,
    
    // Actions
    toggleDataSource,
    filterMockData,
    resetMockFilter,
    clearApiData,
    setApiDataAndSwitch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
