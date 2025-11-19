// src/components/AGDataGrid.jsx
import { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './AGDataGrid.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function AGDataGrid({ 
  columns, 
  rows, 
  loading = false, 
  onRowClick,
  exportButtons 
}) {
  const gridRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Transform columns to AG Grid format
  const columnDefs = useMemo(() => {
    return columns.map(col => {
      const colDef = {
        field: col.field,
        headerName: col.headerName || col.field,
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: 120,
        wrapText: false,
        autoHeight: false,
        // Hide some columns by default to reduce clutter
        hide: ['footprint', 'height', 'usageShare', 'sourceType'].includes(col.field)
      };

      // Custom cell renderer for specific fields
      if (col.field === 'qualityScore') {
        colDef.cellRenderer = (params) => {
          // Generate quality score if not present (for mock data)
          let score = params.value;
          if (!score && score !== 0) {
            // Generate based on data completeness
            const data = params.data;
            let completeness = 0;
            if (data.locationName) completeness += 20;
            if (data.locationAddress) completeness += 20;
            if (data.latitude && data.longitude) completeness += 20;
            if (data.postcode) completeness += 20;
            if (data.countryIso3) completeness += 20;
            score = completeness;
          }
          
          score = parseFloat(score);
          if (isNaN(score)) return '-';
          
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

          const container = document.createElement('div');
          container.className = badgeClass;
          container.textContent = `${score.toFixed(0)}% - ${label}`;
          return container;
        };
        colDef.minWidth = 150;
        colDef.flex = 0;
      }

      // Format phone numbers
      if (col.field === 'phone') {
        colDef.cellRenderer = (params) => {
          if (!params.value) return '-';
          const phones = Array.isArray(params.value) ? params.value : [params.value];
          return phones.join(', ');
        };
      }

      // Format emails
      if (col.field === 'email') {
        colDef.cellRenderer = (params) => {
          if (!params.value) return '-';
          const emails = Array.isArray(params.value) ? params.value : [params.value];
          return emails.map(email => `<a href="mailto:${email}">${email}</a>`).join(', ');
        };
      }

      // Format coordinates
      if (col.field === 'latitude' || col.field === 'longitude') {
        colDef.cellRenderer = (params) => {
          if (!params.value) return '-';
          return parseFloat(params.value).toFixed(6);
        };
      }

      return colDef;
    });
  }, [columns]);

  // Default column definition
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: false,
    floatingFilter: false, // Disable floating filters for cleaner look
    suppressMenu: false,
  }), []);

  // Grid options
  const gridOptions = useMemo(() => ({
    rowSelection: 'multiple',
    suppressRowClickSelection: false,
    animateRows: true,
    pagination: true,
    paginationPageSize: 20,
    paginationPageSizeSelector: [10, 20, 50, 100],
    enableCellTextSelection: true,
    rowMultiSelectWithClick: false,
    suppressCellFocus: true,
  }), []);

  // Handle row click
  const onRowClicked = useCallback((event) => {
    if (onRowClick) {
      onRowClick(event.data);
    }
  }, [onRowClick]);

  // Handle selection change
  const onSelectionChanged = useCallback(() => {
    if (gridRef.current) {
      const selectedNodes = gridRef.current.api.getSelectedRows();
      setSelectedRows(selectedNodes);
    }
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsCsv({
        fileName: 'locations.csv',
        columnSeparator: ','
      });
    }
  }, []);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (gridRef.current) {
      // Note: Excel export requires ag-grid-enterprise
      // For community edition, we'll use CSV
      gridRef.current.api.exportDataAsCsv({
        fileName: 'locations.csv'
      });
    }
  }, []);

  // Auto-size all columns
  const autoSizeAll = useCallback(() => {
    if (gridRef.current) {
      const allColumnIds = [];
      gridRef.current.api.getAllGridColumns().forEach((column) => {
        allColumnIds.push(column.getId());
      });
      gridRef.current.api.autoSizeColumns(allColumnIds, false);
    }
  }, []);

  // Grid ready handler
  const onGridReady = useCallback((params) => {
    // Auto-size columns on initial load
    setTimeout(() => {
      autoSizeAll();
    }, 100);
  }, [autoSizeAll]);

  return (
    <div className="ag-data-grid-container">
      {/* Toolbar */}
      <div className="ag-grid-toolbar">
        <div className="toolbar-left">
          <button onClick={autoSizeAll} className="toolbar-btn">
            📐 Auto-size Columns
          </button>
          {selectedRows.length > 0 && (
            <span className="selected-count">
              {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div className="toolbar-right">
          <button onClick={exportToCSV} className="toolbar-btn">
            📥 Export CSV
          </button>
          {exportButtons}
        </div>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: '70vh', minHeight: 500, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          rowData={loading ? [] : rows}
          defaultColDef={defaultColDef}
          {...gridOptions}
          onGridReady={onGridReady}
          onRowClicked={onRowClicked}
          onSelectionChanged={onSelectionChanged}
          domLayout="normal"
        />
      </div>

      {/* Info */}
      <div className="ag-grid-footer">
        <div className="grid-info">
          Total locations: <strong>{rows.length}</strong>
        </div>
      </div>
    </div>
  );
}
