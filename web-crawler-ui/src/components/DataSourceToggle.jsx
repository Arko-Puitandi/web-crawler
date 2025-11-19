// src/components/DataSourceToggle.jsx
import { useAppContext } from '../context/AppContext';

export const DataSourceToggle = ({ loading }) => {
  const { useMockData, toggleDataSource, apiData, clearApiData, mockLocations } = useAppContext();

  return (
    <div className="card data-source-card">
      <div className="data-source-info">
        <span className="section-title" style={{ margin: 0 }}>
          Data Source
        </span>
        <button
          onClick={toggleDataSource}
          disabled={loading}
          className={`badge ${useMockData ? 'badge-mock' : 'badge-api'}`}
        >
          {useMockData ? '📦 Mock Data' : '🌐 API Data'}
        </button>
        <span className="record-count">
          {useMockData ? mockLocations.length : apiData.length} records
        </span>
      </div>
      {apiData.length > 0 && (
        <button
          onClick={clearApiData}
          disabled={loading}
          className="btn btn-outline-error"
        >
          Clear API Data
        </button>
      )}
    </div>
  );
};
