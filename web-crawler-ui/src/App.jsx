// src/App.optimized.jsx
import React from 'react';
import { useAppContext } from './context/AppContext';
import { useFetchLocations } from './hooks/useLocationData';
import { useNotification } from './hooks/useNotification';
import CustomDataGrid from './components/CustomDataGrid.jsx';
import LocationDetailModal from './components/LocationDetailModal.jsx';
import { SearchBar } from './components/SearchBar';
import { DataSourceToggle } from './components/DataSourceToggle';
import { Notifications } from './components/Notifications';
import { ExportButtons } from './components/ExportButtons';
import { FilterBox } from './components/FilterBox';
import { AdvancedFilter } from './components/AdvancedFilter';
import { MapVisualization } from './components/MapVisualization';
import { BulkUpload } from './components/BulkUpload';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';

const columns = [
  { field: 'locationName', headerName: 'Location Name' },
  { field: 'locationAddress', headerName: 'Address' },
  { field: 'activityAtAsset', headerName: 'Activity' },
  { field: 'latitude', headerName: 'Latitude' },
  { field: 'longitude', headerName: 'Longitude' },
  { field: 'countryIso3', headerName: 'Country ISO3' },
  { field: 'postcode', headerName: 'Postcode' },
  { field: 'state', headerName: 'State' },
  { field: 'streetOrCity', headerName: 'City' },
  { field: 'footprint', headerName: 'Footprint (WKT)' },
  { field: 'height', headerName: 'Height (m)' },
  { field: 'usageShare', headerName: 'Usage Share' },
  { field: 'sourceUrl', headerName: 'Source URL' },
  { field: 'sourceType', headerName: 'Source Type' },
];

function App() {
  const {
    useMockData,
    activeData,
    apiData,
    url,
    filterMockData,
    setApiDataAndSwitch,
  } = useAppContext();

  const { notification, showSuccess, showError } = useNotification();
  const { mutate: fetchLocations, isPending: isLoading } = useFetchLocations();
  
  // State for filtered data from FilterBox
  const [filteredData, setFilteredData] = React.useState(activeData);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [showBulkUpload, setShowBulkUpload] = React.useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState(null);
  const [visibleColumns, setVisibleColumns] = React.useState(
    () => new Set(columns.map((c) => c.field))
  );

  // Update filtered data when activeData changes
  React.useEffect(() => {
    setFilteredData(activeData);
  }, [activeData]);

  const handleFilterChange = (filtered) => {
    setFilteredData(filtered);
  };

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) newSet.delete(field);
      else newSet.add(field);
      return newSet;
    });
  };

  const hasActiveFilters = filteredData.length !== activeData.length;

  const handleResetFilters = () => {
    setFilteredData(activeData);
  };

  // Get current page data from DataGrid
  const getCurrentPageData = () => {
    const start = currentPage * pageSize;
    return filteredData.slice(start, start + pageSize);
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    // Parse multiple URLs (split by newlines, commas, or semicolons)
    const urls = url
      .split(/[\n,;]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      showError('Please enter at least one URL');
      return;
    }

    // Mock data mode - filter locally
    if (useMockData) {
      // For mock mode, just use the first URL
      const count = filterMockData(urls[0]);
      if (count > 0) {
        showSuccess(`Found ${count} location(s) matching "${urls[0]}" in mock data`);
      } else {
        showError(`No locations found matching "${urls[0]}" in mock data`);
      }
      return;
    }

    // API mode - send all URLs to backend at once
    const urlsToFetch = urls.length === 1 ? urls[0] : urls;
    
    fetchLocations(urlsToFetch, {
      onSuccess: (data) => {
        setApiDataAndSwitch(data);
        const urlCount = urls.length;
        const message = urlCount === 1 
          ? `Successfully fetched ${data.length} location(s) from ${urls[0]}`
          : `Successfully fetched ${data.length} location(s) from ${urlCount} URLs`;
        showSuccess(message);
      },
      onError: (error) => {
        console.error('API Error:', error);
        let errorMessage = 'Something went wrong. ';

        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage += 'Cannot connect to backend server. Please ensure it\'s running on http://localhost:4000';
        } else if (error.message.includes('timeout')) {
          errorMessage += 'Request timed out. The server might be slow or down.';
        } else {
          errorMessage += error.message;
        }

        showError(errorMessage);
      },
    });
  };

  // PDF Export
  const exportPDF = (data, filename = 'locations.pdf') => {
    if (!data.length) {
      showError('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    autoTable(doc, {
      head: [columns.map((c) => c.headerName)],
      body: data.map((row) => columns.map((c) => row[c.field] || '')),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(filename);
    showSuccess(`PDF exported successfully (${data.length} rows)`);
  };

  const exportCSV = (data, filename = 'locations.csv') => {
    if (!data.length) {
      showError('No data to export');
      return;
    }

    const headerFields = columns.map((c) => c.field);
    const headerRow = columns.map((c) => `"${c.headerName}"`).join(',');

    const dataRows = data.map((row) =>
      headerFields
        .map((field) => {
          const val = row[field] != null ? String(row[field]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess(`CSV exported successfully (${data.length} rows)`);
  };

  const handleExportPage = () => {
    const pageData = getCurrentPageData();
    exportCSV(pageData, 'locations-current-page.csv');
  };

  const handleExportAll = () => {
    exportCSV(filteredData, 'locations-all-data.csv');
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
          <DataSourceToggle loading={isLoading} />
        </section>

        {/* Search Bar */}
        <section className="section">
          <h3 className="section-title">Crawl URL</h3>
          <SearchBar onSubmit={handleSearch} loading={isLoading} />
        </section>

        {/* Notifications */}
        <Notifications notification={notification} />

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="modal-overlay" onClick={() => setShowBulkUpload(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowBulkUpload(false)}>×</button>
              <BulkUpload onUploadComplete={() => {
                setShowBulkUpload(false);
                showSuccess('Bulk upload completed! Check your downloads.');
              }} />
            </div>
          </div>
        )}

        {/* Advanced Filter */}
        {showAdvancedFilter && activeData.length > 0 && (
          <section className="section">
            <AdvancedFilter 
              data={activeData}
              columns={columns}
              onFilterChange={handleFilterChange}
            />
          </section>
        )}

        {/* Map Visualization */}
        {showMap && activeData.length > 0 && (
          <section className="section">
            <MapVisualization 
              locations={filteredData}
              onMarkerClick={(location, index) => {
                showSuccess(`Selected: ${location.locationName || location.locationAddress}`);
              }}
            />
          </section>
        )}

        {/* Data Grid with Filter Panel */}
        <section className="section">
          <div className="data-grid-header">
            <h3 className="section-title">
              Location Data ({filteredData.length} {filteredData.length !== activeData.length ? `of ${activeData.length}` : ''} rows)
            </h3>
            <div className="data-grid-actions">
              <button 
                className="btn-action"
                onClick={() => setShowBulkUpload(true)}
                title="Bulk Upload"
              >
                📦 Bulk Upload
              </button>
              <button 
                className="btn-action"
                onClick={() => setShowMap(!showMap)}
                title="Toggle Map"
                disabled={activeData.length === 0}
              >
                🗺️ {showMap ? 'Hide' : 'Show'} Map
              </button>
              <button 
                className="filter-btn" 
                onClick={() => setShowFilterModal(!showFilterModal)}
                type="button"
                disabled={activeData.length === 0}
              >
                ⚙️ Columns
              </button>
              {activeData.length > 0 && hasActiveFilters && (
                <button 
                  className="reset-filters-btn" 
                  onClick={handleResetFilters}
                  type="button"
                  title="Clear all active filters"
                >
                  ↻ Reset Filters
                </button>
              )}
            </div>
          </div>

          <div className="table-with-filter">
            <div className="table-container">
              <CustomDataGrid 
                columns={columns} 
                rows={filteredData} 
                loading={isLoading}
                onRowClick={(location) => setSelectedLocation(location)}
                exportButtons={
                  activeData.length > 0 ? (
                    <ExportButtons 
                      onExportAll={handleExportAll} 
                      onExportPage={handleExportPage}
                      hasApiData={!useMockData && apiData.length > 0}
                    />
                  ) : null
                }
              />
            </div>

            {/* Filter Panel */}
            {showFilterModal && activeData.length > 0 && (
              <FilterBox 
                data={activeData} 
                onFilterChange={handleFilterChange}
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                columns={columns}
                visibleColumns={visibleColumns}
                onColumnVisibilityChange={handleColumnVisibilityChange}
              />
            )}
          </div>
        </section>
      </div>

      {/* Location Detail Modal */}
      {selectedLocation && (
        <LocationDetailModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
}

export default App;
