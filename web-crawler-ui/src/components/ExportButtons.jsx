// src/components/ExportButtons.jsx
import { useState } from 'react';

export const ExportButtons = ({ onExportAll, onExportPage, hasApiData }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="export-split-button">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="export-main-btn"
      >
        📥 Export CSV
        <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
      </button>

      {showDropdown && (
        <div className="export-dropdown">
          <button
            type="button"
            onClick={() => {
              onExportPage();
              setShowDropdown(false);
            }}
            className="export-option"
          >
            <span className="export-icon">📄</span>
            <span className="export-text">
              <strong>Export Current Page</strong>
              <small>Export visible rows only</small>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onExportAll();
              setShowDropdown(false);
            }}
            className={`export-option ${!hasApiData ? 'disabled' : ''}`}
            disabled={!hasApiData}
          >
            <span className="export-icon">📦</span>
            <span className="export-text">
              <strong>Export All Data</strong>
              <small>{hasApiData ? 'Export complete dataset' : 'API data unavailable'}</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
