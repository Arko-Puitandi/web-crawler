// src/App.optimized.jsx
import { useAppContext } from './context/AppContext';
import { useFetchLocations } from './hooks/useLocationData';
import { useNotification } from './hooks/useNotification';
import DataGrid from './components/DataGrid.jsx';
import { SearchBar } from './components/SearchBar';
import { DataSourceToggle } from './components/DataSourceToggle';
import { Notifications } from './components/Notifications';
import { ExportButtons } from './components/ExportButtons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
  { field: 'usageShare', headerName: 'Usage Share' },
  { field: 'sourceUrl', headerName: 'Source URL' },
  { field: 'sourceType', headerName: 'Source Type' },
];

function App() {
  const {
    useMockData,
    activeData,
    url,
    filterMockData,
    setApiDataAndSwitch,
  } = useAppContext();

  const { notification, showSuccess, showError } = useNotification();
  const { mutate: fetchLocations, isPending: isLoading } = useFetchLocations();

  const handleSearch = (e) => {
    e.preventDefault();

    // Mock data mode - filter locally
    if (useMockData) {
      const count = filterMockData(url);
      if (count > 0) {
        showSuccess(`Found ${count} location(s) matching "${url}" in mock data`);
      } else {
        showError(`No locations found matching "${url}" in mock data`);
      }
      return;
    }

    // API mode - fetch from server
    fetchLocations(url, {
      onSuccess: (data) => {
        setApiDataAndSwitch(data);
        showSuccess(`Successfully fetched ${data.length} location(s) from ${url}`);
      },
      onError: (error) => {
        console.error('API Error:', error);
        let errorMessage = 'Something went wrong. ';

        if (error.message.includes('fetch')) {
          errorMessage += 'Cannot connect to backend server. Please ensure it\'s running.';
        } else if (error.message.includes('timeout')) {
          errorMessage += 'Request timed out. The server might be slow or down.';
        } else {
          errorMessage += error.message;
        }

        showError(errorMessage);
      },
    });
  };

  const handleExportCSV = () => {
    if (!activeData.length) {
      showError('No data to export');
      return;
    }

    const headerFields = columns.map((c) => c.field);
    const headerRow = columns.map((c) => `"${c.headerName}"`).join(',');

    const dataRows = activeData.map((row) =>
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
    link.setAttribute('download', 'locations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('CSV exported successfully');
  };

  const handleExportPDF = () => {
    if (!activeData.length) {
      showError('No data to export');
      return;
    }

    const doc = new jsPDF();
    const tableColumn = columns.map((c) => c.headerName);
    const tableRows = activeData.map((row) =>
      columns.map((c) => (row[c.field] != null ? String(row[c.field]) : ''))
    );

    doc.setFontSize(14);
    doc.text('Location Data', 14, 16);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200] },
    });

    doc.save('locations.pdf');
    showSuccess('PDF exported successfully');
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

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <p className="loading-text">Fetching location data...</p>
          </div>
        )}

        {/* Export Buttons */}
        <section className="section">
          <h3 className="section-title">Export Data</h3>
          <ExportButtons onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
        </section>

        {/* Data Grid */}
        <section className="section">
          <h3 className="section-title">Location Data ({activeData.length} rows)</h3>
          <DataGrid columns={columns} rows={activeData} loading={isLoading} />
        </section>
      </div>
    </div>
  );
}

export default App;
