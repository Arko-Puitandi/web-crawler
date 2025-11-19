import React, { useState, useEffect } from 'react';

export const AdvancedFilter = ({ data, onFilterChange, columns }) => {
  const [filters, setFilters] = useState({});
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('savedFilters');
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, data]);

  const applyFilters = () => {
    if (!data) return;

    let filtered = [...data];

    Object.entries(filters).forEach(([field, filterValue]) => {
      if (!filterValue || filterValue === '') return;

      filtered = filtered.filter(row => {
        const value = row[field];
        if (value == null) return false;

        const valueStr = value.toString().toLowerCase();
        const filterStr = filterValue.toString().toLowerCase();

        // Special handling for quality score
        if (field === 'qualityScore') {
          const score = parseFloat(value);
          const [min, max] = filterStr.split('-').map(s => parseFloat(s));
          if (!isNaN(min) && !isNaN(max)) {
            return score >= min && score <= max;
          }
          return score >= parseFloat(filterStr);
        }

        // Text search
        return valueStr.includes(filterStr);
      });
    });

    onFilterChange(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
    onFilterChange(data);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;

    const newFilter = {
      id: Date.now(),
      name: filterName,
      filters: { ...filters }
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('savedFilters', JSON.stringify(updated));
    setFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
  };

  const handleDeleteFilter = (filterId) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('savedFilters', JSON.stringify(updated));
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(v => v && v !== '').length;
  };

  return (
    <div className="advanced-filter">
      <div className="filter-header">
        <h3>🔍 Advanced Filters</h3>
        <div className="filter-actions">
          <span className="active-count">
            {getActiveFilterCount()} active
          </span>
          <button onClick={handleClearFilters} className="btn-clear">
            Clear All
          </button>
          <button onClick={() => setShowSaveDialog(true)} className="btn-save">
            💾 Save
          </button>
        </div>
      </div>

      <div className="filter-grid">
        {/* Quality Score Filter */}
        <div className="filter-group">
          <label>Quality Score</label>
          <select
            value={filters.qualityScore || ''}
            onChange={(e) => handleFilterChange('qualityScore', e.target.value)}
          >
            <option value="">All</option>
            <option value="90-100">Excellent (90%+)</option>
            <option value="70-89">Good (70-89%)</option>
            <option value="50-69">Fair (50-69%)</option>
            <option value="0-49">Poor (&lt;50%)</option>
          </select>
        </div>

        {/* Dynamic filters for each column */}
        {columns
          .filter(col => col.field !== 'qualityScore')
          .slice(0, 6)
          .map(col => (
            <div key={col.field} className="filter-group">
              <label>{col.headerName}</label>
              <input
                type="text"
                placeholder={`Filter by ${col.headerName.toLowerCase()}...`}
                value={filters[col.field] || ''}
                onChange={(e) => handleFilterChange(col.field, e.target.value)}
              />
            </div>
          ))}
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="saved-filters">
          <h4>📌 Saved Filters</h4>
          <div className="saved-filter-list">
            {savedFilters.map(savedFilter => (
              <div key={savedFilter.id} className="saved-filter-item">
                <button
                  onClick={() => handleLoadFilter(savedFilter)}
                  className="btn-load-filter"
                >
                  {savedFilter.name}
                </button>
                <button
                  onClick={() => handleDeleteFilter(savedFilter.id)}
                  className="btn-delete-filter"
                  title="Delete"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Save Filter Preset</h3>
            <input
              type="text"
              placeholder="Enter filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveFilter()}
              autoFocus
            />
            <div className="dialog-actions">
              <button onClick={() => setShowSaveDialog(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleSaveFilter} className="btn-confirm">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .advanced-filter {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 20px 0;
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .filter-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
        }

        .filter-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .active-count {
          padding: 4px 12px;
          background: #3b82f6;
          color: white;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .btn-clear, .btn-save {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-clear {
          background: #f3f4f6;
          color: #6b7280;
        }

        .btn-clear:hover {
          background: #e5e7eb;
        }

        .btn-save {
          background: #3b82f6;
          color: white;
        }

        .btn-save:hover {
          background: #2563eb;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .filter-group input,
        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .filter-group input:focus,
        .filter-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .saved-filters {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .saved-filters h4 {
          margin: 0 0 12px 0;
          color: #374151;
          font-size: 1rem;
        }

        .saved-filter-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .saved-filter-item {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .btn-load-filter {
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .btn-load-filter:hover {
          background: #e5e7eb;
          border-color: #3b82f6;
        }

        .btn-delete-filter {
          padding: 4px 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .btn-delete-filter:hover {
          opacity: 1;
        }

        .save-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .save-dialog {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          min-width: 400px;
        }

        .save-dialog h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }

        .save-dialog input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .dialog-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn-cancel, .btn-confirm {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #f3f4f6;
          color: #6b7280;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-confirm {
          background: #3b82f6;
          color: white;
        }

        .btn-confirm:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};
