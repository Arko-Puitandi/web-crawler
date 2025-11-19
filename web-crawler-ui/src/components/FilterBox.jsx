// src/components/FilterBox.jsx
import { useState, useEffect } from 'react';
import './FilterBox.css';

export const FilterBox = ({ data, onFilterChange, isOpen, onClose, columns, visibleColumns, onColumnVisibilityChange }) => {
  // Column-specific search filters
  const [columnFilters, setColumnFilters] = useState({});

  // Initialize column filters
  useEffect(() => {
    const initialFilters = {};
    columns.forEach(col => {
      initialFilters[col.field] = '';
    });
    setColumnFilters(initialFilters);
  }, [columns]);

  // Get unique values for a column
  const getUniqueValues = (field) => {
    const values = data
      .map(item => item[field])
      .filter(value => value != null && value !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    
    // Remove "Exclusive" and "Shared" from usageShare field
    if (field === 'usageShare') {
      return values.filter(value => 
        String(value).toLowerCase() !== 'exclusive' && 
        String(value).toLowerCase() !== 'shared'
      );
    }
    
    return values;
  };

  // Apply all column filters
  useEffect(() => {
    const filteredData = data.filter(item => {
      // Check each column filter
      return Object.keys(columnFilters).every(field => {
        const filterValue = columnFilters[field];
        if (!filterValue) return true; // No filter applied
        
        const itemValue = item[field];
        if (itemValue == null) return false;
        
        return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });

    onFilterChange(filteredData);
  }, [columnFilters, data]);

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearAllFilters = () => {
    const clearedFilters = {};
    columns.forEach(col => {
      clearedFilters[col.field] = '';
    });
    setColumnFilters(clearedFilters);
  };

  const hasActiveFilters = Object.values(columnFilters).some(val => val !== '');

  if (!isOpen) return null;

  return (
    <div className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="filter-sidebar-header">
        <h3>⚙️ Columns</h3>
        <button className="close-sidebar-btn" onClick={onClose} type="button">✕</button>
      </div>

      <div className="filter-sidebar-content">
          {/* Column Visibility Section */}
          <div className="filter-section">
            <p className="filter-description">Show or hide columns in the data grid below.</p>
            <div className="toggle-group">
              {columns.map(col => (
                <div key={col.field} className="toggle-item">
                  <span className="toggle-label">{col.headerName}</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.field)}
                      onChange={() => onColumnVisibilityChange(col.field)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-sidebar-footer">
          <button className="apply-btn" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
  );
};
