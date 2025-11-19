// src/components/CustomDataGrid.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import './CustomDataGrid.css';

export default function CustomDataGrid({ 
  columns, 
  rows, 
  loading = false, 
  onRowClick,
  exportButtons 
}) {
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [columnWidths, setColumnWidths] = useState({});
  const [columnOrder, setColumnOrder] = useState(columns.map(col => col.field));
  const [hiddenColumns, setHiddenColumns] = useState(new Set(['footprint', 'height', 'usageShare', 'sourceType']));
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [draggingColumn, setDraggingColumn] = useState(null);
  const gridRef = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Auto-generate quality scores for mock data
  const enhancedRows = useMemo(() => {
    return rows.map(row => {
      if (row.qualityScore === undefined) {
        let completeness = 0;
        if (row.locationName) completeness += 20;
        if (row.locationAddress) completeness += 20;
        if (row.latitude && row.longitude) completeness += 20;
        if (row.postcode) completeness += 20;
        if (row.countryIso3) completeness += 20;
        return { ...row, qualityScore: completeness };
      }
      return row;
    });
  }, [rows]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return enhancedRows.filter(row => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String(row[field] || '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });
  }, [enhancedRows, filters]);

  // Apply sorting
  const sortedRows = useMemo(() => {
    if (!sortConfig.field) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortConfig]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  // Sorting handler
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter handler
  const handleFilter = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page
  };

  // Row selection
  const toggleRowSelection = (rowIndex) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedRows.map((_, idx) => idx)));
    }
  };

  // Column resize handlers
  const startResize = (field, e) => {
    e.stopPropagation();
    setResizingColumn(field);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[field] || 150;
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, resizeStartWidth.current + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  // Column drag and drop handlers
  const handleDragStart = (field, e) => {
    setDraggingColumn(field);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (field, e) => {
    e.preventDefault();
    if (!draggingColumn || draggingColumn === field) return;

    const newOrder = [...columnOrder];
    const dragIndex = newOrder.indexOf(draggingColumn);
    const dropIndex = newOrder.indexOf(field);

    newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggingColumn);
    setColumnOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggingColumn(null);
  };

  // Export to CSV
  const exportToCSV = (allData = false) => {
    const dataToExport = allData ? sortedRows : paginatedRows;
    const orderedColumns = columnOrder
      .map(field => columns.find(col => col.field === field))
      .filter(col => col && !hiddenColumns.has(col.field));
    
    const headers = orderedColumns.map(col => col.headerName || col.field).join(',');
    const csvRows = dataToExport.map(row => {
      return orderedColumns.map(col => {
        const value = row[col.field];
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Column visibility toggle
  const toggleColumn = (field) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  };

  // Custom cell renderer
  const renderCell = (column, row) => {
    const value = row[column.field];

    // Confidence badge rendering
    if (column.field === 'confidence') {
      const confidence = parseFloat(value);
      if (isNaN(confidence)) return <span className="confidence-badge confidence-unknown">-</span>;

      let badgeClass = 'confidence-badge ';
      let label = '';

      if (confidence >= 0.90) {
        badgeClass += 'confidence-high';
        label = 'HIGH';
      } else if (confidence >= 0.75) {
        badgeClass += 'confidence-medium-high';
        label = 'MEDIUM-HIGH';
      } else if (confidence >= 0.70) {
        badgeClass += 'confidence-medium';
        label = 'MEDIUM';
      } else {
        badgeClass += 'confidence-low';
        label = 'LOW';
      }

      return (
        <span className={badgeClass} title={`Confidence: ${(confidence * 100).toFixed(0)}%`}>
          {label}
        </span>
      );
    }

    // Extraction method badge rendering
    if (column.field === 'extractionMethod') {
      if (!value) return <span className="method-badge method-unknown">unknown</span>;
      
      const methodLabels = {
        'json-ld': 'JSON-LD',
        'microdata': 'Microdata',
        'dom-block': 'DOM Block',
        'heuristic': 'Heuristic',
        'map-iframe': 'Map',
        'playwright-xhr': 'XHR',
        'inline-script': 'Script',
        'sequential-headers': 'Headers',
        'data-attribute': 'Data Attr',
        'location-list': 'List'
      };

      const label = methodLabels[value] || value;
      const methodClass = value.replace(/[^a-z0-9]/gi, '-');

      return (
        <span className={`method-badge method-${methodClass}`} title={`Extraction Method: ${value}`}>
          {label}
        </span>
      );
    }

    if (column.field === 'qualityScore') {
      const score = parseFloat(value);
      if (isNaN(score)) return <span>-</span>;

      let badgeClass = 'quality-badge ';
      let label = '';

      if (score >= 90) {
        badgeClass += 'quality-excellent';
        label = 'Excellent';
      } else if (score >= 70) {
        badgeClass += 'quality-good';
        label = 'Good';
      } else if (score >= 50) {
        badgeClass += 'quality-fair';
        label = 'Fair';
      } else {
        badgeClass += 'quality-poor';
        label = 'Poor';
      }

      return (
        <span className={badgeClass}>
          {score.toFixed(0)}% - {label}
        </span>
      );
    }

    if (column.field === 'latitude' || column.field === 'longitude') {
      return value ? parseFloat(value).toFixed(6) : '-';
    }

    return value || '-';
  };

  const visibleColumns = columnOrder
    .map(field => columns.find(col => col.field === field))
    .filter(col => col && !hiddenColumns.has(col.field));

  if (loading) {
    return (
      <div className="custom-grid-loading">
        <div className="spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="custom-data-grid" ref={gridRef}>
      {/* Toolbar */}
      <div className="grid-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-info">
            {sortedRows.length} locations
          </span>
          {/* <button 
            className="toolbar-btn"
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            title="Show/Hide Columns"
          >
            ⚙️ Columns
          </button> */}
        </div>
        
        <div className="toolbar-right">
          <button 
            className="toolbar-btn toolbar-btn-primary"
            onClick={() => exportToCSV(false)}
            title="Export current page"
          >
            📄 Export Page
          </button>
          <button 
            className="toolbar-btn toolbar-btn-secondary"
            onClick={() => exportToCSV(true)}
            title="Export all data"
          >
            📦 Export All
          </button>
        </div>
      </div>

      {/* Column Menu */}
      {showColumnMenu && (
        <div className="column-menu">
          <div className="column-menu-header">
            <h4>Show/Hide Columns</h4>
            <button onClick={() => setShowColumnMenu(false)}>✕</button>
          </div>
          <div className="column-menu-items">
            {columns.map(col => (
              <label key={col.field} className="column-menu-item">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.has(col.field)}
                  onChange={() => toggleColumn(col.field)}
                />
                <span>{col.headerName || col.field}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Grid Table */}
      <div className="grid-container">
        <table className="data-grid-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectedRows.size === paginatedRows.length && paginatedRows.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              {visibleColumns.map(col => (
                <th 
                  key={col.field}
                  draggable
                  onDragStart={(e) => handleDragStart(col.field, e)}
                  onDragOver={(e) => handleDragOver(col.field, e)}
                  onDragEnd={handleDragEnd}
                  className={`${sortConfig.field === col.field ? 'sorted' : ''} ${draggingColumn === col.field ? 'dragging' : ''}`}
                  style={{ 
                    width: columnWidths[col.field] || 'auto',
                    minWidth: '120px'
                  }}
                >
                  <div 
                    className="header-content"
                    onClick={() => handleSort(col.field)}
                  >
                    <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                    <span className="header-title">{col.headerName || col.field}</span>
                    {sortConfig.field === col.field && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div 
                    className="resize-handle"
                    onMouseDown={(e) => startResize(col.field, e)}
                    title="Drag to resize"
                  />
                </th>
              ))}
            </tr>
            <tr className="filter-row">
              <th className="select-column"></th>
              {visibleColumns.map(col => (
                <th key={col.field}>
                  <input
                    type="text"
                    className="column-filter"
                    placeholder={`Filter ${col.headerName || col.field}...`}
                    value={filters[col.field] || ''}
                    onChange={(e) => handleFilter(col.field, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="no-data">
                  No data to display
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr 
                  key={idx}
                  className={`${selectedRows.has(idx) ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => toggleRowSelection(idx)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  {visibleColumns.map(col => (
                    <td key={col.field}>
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="grid-pagination">
        <div className="pagination-info">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length}
        </div>
        
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="page-btn"
          >
            ⏮️ First
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="page-btn"
          >
            ◀️ Prev
          </button>
          
          <span className="page-numbers">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next ▶️
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Last ⏭️
          </button>
        </div>

        <div className="pagination-size">
          <label>
            Rows per page:
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
