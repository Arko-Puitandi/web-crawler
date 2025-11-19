// src/App.jsx
import { useState, useMemo, useEffect } from "react";
import DataGrid from "./components/DataGrid.jsx";
import { mockLocations } from "./mock/mockData.js";
import { getApiUrl, fetchWithTimeout, API_CONFIG } from "./config/api.js";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./App.css";

const columns = [
  { field: "locationName", headerName: "Location Name" },
  { field: "locationAddress", headerName: "Address" },
  { field: "activityAtAsset", headerName: "Activity" },
  { field: "latitude", headerName: "Latitude" },
  { field: "longitude", headerName: "Longitude" },
  { field: "countryIso3", headerName: "Country ISO3" },
  { field: "postcode", headerName: "Postcode" },
  { field: "state", headerName: "State" },
  { field: "streetOrCity", headerName: "City" },
  { field: "usageShare", headerName: "Usage Share" },
  { field: "sourceUrl", headerName: "Source URL" },
  { field: "sourceType", headerName: "Source Type" },
];

function App() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]); // backend data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useMockData, setUseMockData] = useState(true); // Toggle state
  const [successMessage, setSuccessMessage] = useState("");
  const [filteredMockData, setFilteredMockData] = useState(mockLocations); // Filtered mock data
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Determine active data based on toggle
  const activeData = useMockData ? filteredMockData : data;

  // Get all unique URLs from data
  const allUrls = useMemo(() => {
    const urls = new Set();
    activeData.forEach(location => {
      if (location.sourceUrl) urls.add(location.sourceUrl);
    });
    return Array.from(urls);
  }, [activeData]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle URL input change with autocomplete
  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    
    if (value.trim().length > 0) {
      const filtered = allUrls.filter(u => 
        u.toLowerCase().includes(value.toLowerCase())
      );
      setAutocompleteOptions(filtered);
      setShowAutocomplete(filtered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setShowAutocomplete(false);
      setAutocompleteOptions([]);
    }
  };

  // Handle autocomplete selection
  const handleSelectAutocomplete = (selectedUrl) => {
    setUrl(selectedUrl);
    setShowAutocomplete(false);
    setAutocompleteOptions([]);
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e) => {
    if (!showAutocomplete) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < autocompleteOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        // If an autocomplete item is highlighted, select it and prevent form submission
        e.preventDefault();
        handleSelectAutocomplete(autocompleteOptions[highlightedIndex]);
      } else {
        // If no item is highlighted, close autocomplete and allow form submission
        setShowAutocomplete(false);
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // If in mock data mode, just filter mock data by URL
    if (useMockData) {
      if (!url.trim()) {
        // If search is empty, show all mock data
        setFilteredMockData(mockLocations);
        setSuccessMessage(`Showing all ${mockLocations.length} mock locations`);
        return;
      }

      const filtered = mockLocations.filter(location => 
        location.sourceUrl && location.sourceUrl.toLowerCase().includes(url.toLowerCase())
      );
      
      setFilteredMockData(filtered);
      
      if (filtered.length > 0) {
        setSuccessMessage(`Found ${filtered.length} location(s) matching "${url}" in mock data`);
      } else {
        setError(`No locations found matching "${url}" in mock data`);
      }
      return;
    }

    // If in API mode, call the backend API
    setLoading(true);

    try {
      // Simulate network delay for better UX visualization (remove in production)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call your backend API with timeout
      const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.LOCATIONS);
      const res = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to fetch data");
      }

      // Expecting json to be an array of location objects
      if (!Array.isArray(json)) {
        throw new Error("Invalid response format: expected an array");
      }

      setData(json);
      setSuccessMessage(`Successfully fetched ${json.length} location(s) from ${url}`);
    } catch (err) {
      console.error("API Error:", err);
      let errorMessage = "Something went wrong. ";
      
      if (err.message.includes("fetch")) {
        errorMessage += "Cannot connect to backend server. Please ensure it's running.";
      } else if (err.message.includes("timeout")) {
        errorMessage += "Request timed out. The server might be slow or down.";
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDataSource = () => {
    setUseMockData(!useMockData);
    setError("");
    setSuccessMessage("");
    // Reset filtered mock data when toggling
    if (useMockData) {
      // Switching to API mode - no need to reset
    } else {
      // Switching to mock mode - reset filter
      setFilteredMockData(mockLocations);
    }
  };

  const handleClearData = () => {
    setData([]);
    setUrl("");
    setUseMockData(true);
    setFilteredMockData(mockLocations); // Reset filtered data
    setError("");
    setSuccessMessage("Data cleared. Using mock data.");
  };

  const handleExportCSV = () => {
    if (!activeData.length) {
      alert("No data to export");
      return;
    }

    const headerFields = columns.map((c) => c.field);
    const headerRow = columns.map((c) => `"${c.headerName}"`).join(",");

    const dataRows = activeData.map((row) =>
      headerFields
        .map((field) => {
          const val = row[field] != null ? String(row[field]) : "";
          // Escape quotes
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = [headerRow, ...dataRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "locations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!activeData.length) {
      alert("No data to export");
      return;
    }

    const doc = new jsPDF();

    const tableColumn = columns.map((c) => c.headerName);
    const tableRows = activeData.map((row) =>
      columns.map((c) => (row[c.field] != null ? String(row[c.field]) : ""))
    );

    doc.setFontSize(14);
    doc.text("Location Data", 14, 16);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200] },
    });

    doc.save("locations.pdf");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌐 Web Crawler Locations Viewer</h1>
        <p>Enter a URL to fetch location data from your backend, then view, filter, and export it.</p>
      </header>

      <div className="app-content">
        {/* Data Source Toggle */}
        <section className="section">
          <div className="card data-source-card">
            <div className="data-source-info">
              <span className="section-title" style={{ margin: 0 }}>Data Source</span>
              <button
                onClick={handleToggleDataSource}
                disabled={loading}
                className={`badge ${useMockData ? 'badge-mock' : 'badge-api'}`}
              >
                {useMockData ? "📦 Mock Data" : "🌐 API Data"}
              </button>
              <span className="record-count">
                {useMockData ? mockLocations.length : data.length} records
              </span>
            </div>
            {data.length > 0 && (
              <button
                onClick={handleClearData}
                disabled={loading}
                className="btn btn-outline-error"
              >
                Clear API Data
              </button>
            )}
          </div>
        </section>

        {/* Search bar */}
        <section className="section">
          <h3 className="section-title">Crawl URL</h3>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <input
                type="url"
                placeholder="https://www.wissen.com/contact/location"
                value={url}
                onChange={handleUrlChange}
                onKeyDown={handleKeyDown}
                onFocus={() => url.trim() && setShowAutocomplete(autocompleteOptions.length > 0)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                required
                disabled={loading}
                className="search-input"
                autoComplete="off"
              />
              {showAutocomplete && (
                <div className="autocomplete-dropdown">
                  {autocompleteOptions.map((option, index) => (
                    <div
                      key={option}
                      className={`autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                      onClick={() => handleSelectAutocomplete(option)}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "⏳ Loading..." : "🔍 Search"}
            </button>
            {useMockData && filteredMockData.length !== mockLocations.length && (
              <button 
                type="button" 
                onClick={() => {
                  setFilteredMockData(mockLocations);
                  setUrl("");
                  setSuccessMessage("Reset filter. Showing all mock data.");
                  setError("");
                }}
                className="btn btn-primary"
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
              >
                🔄 Reset Filter
              </button>
            )}
          </form>
        </section>

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">
            <span style={{ fontSize: '1.25rem' }}>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span style={{ fontSize: '1.25rem' }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <p className="loading-text">Fetching location data...</p>
          </div>
        )}

        {/* Export buttons */}
        <section className="section">
          <h3 className="section-title">Export Data</h3>
          <div className="export-buttons">
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-export btn-export-csv"
            >
              📥 Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="btn-export btn-export-pdf"
            >
              📄 Export PDF
            </button>
          </div>
        </section>

        {/* Data grid */}
        <section className="section">
          <h3 className="section-title">Location Data ({activeData.length} rows)</h3>
          <DataGrid columns={columns} rows={activeData} loading={loading} />
        </section>
      </div>
    </div>
  );
}

export default App;
