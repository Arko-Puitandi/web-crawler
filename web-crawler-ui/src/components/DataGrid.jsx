// src/components/DataGrid.jsx
import { useState, useMemo, useEffect, useRef } from 'react'
import './DataGrid.css'

export default function DataGrid({ columns, rows, loading = false, onPageChange, visibleColumns, onColumnVisibilityChange, exportButtons }) {
  const [sortConfig, setSortConfig] = useState({ field: null, direction: null })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [columnWidths, setColumnWidths] = useState({})
  const resizingColumn = useRef(null)
  const startX = useRef(0)
  const startWidth = useRef(0)
  
  // Use internal state if not provided
  const [internalVisibleColumns, setInternalVisibleColumns] = useState(
    () => new Set(columns.map((c) => c.field)),
  )
  
  const activeVisibleColumns = visibleColumns || internalVisibleColumns
  const handleColumnVisibilityChange = onColumnVisibilityChange || ((field) => {
    setInternalVisibleColumns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(field)) newSet.delete(field)
      else newSet.add(field)
      return newSet
    })
  })

  // Reset page when rows change
  useEffect(() => {
    setPage(0)
  }, [rows.length])

  // Notify parent of page changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(page, pageSize);
    }
  }, [page, pageSize, onPageChange])

  const totalPages = Math.ceil(rows.length / pageSize) || 1

  const sortedRows = useMemo(() => {
    if (!sortConfig.field) return rows
    const sorted = [...rows].sort((a, b) => {
      const v1 = a[sortConfig.field]
      const v2 = b[sortConfig.field]

      if (v1 == null && v2 == null) return 0
      if (v1 == null) return 1
      if (v2 == null) return -1

      if (typeof v1 === 'number' && typeof v2 === 'number') {
        return v1 - v2
      }

      return String(v1).localeCompare(String(v2))
    })

    if (sortConfig.direction === 'desc') sorted.reverse()
    return sorted
  }, [rows, sortConfig])

  const pagedRows = useMemo(() => {
    const start = page * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, page, pageSize])

  const toggleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field !== field) {
        return { field, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' }
      }
      return { field: null, direction: null }
    })
  }

  const toggleRowSelection = (index) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) newSet.delete(index)
      else newSet.add(index)
      return newSet
    })
  }

  const toggleAllCurrentPage = () => {
    const indices = pagedRows.map((_, idx) => page * pageSize + idx)
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      const allSelected = indices.every((i) => newSet.has(i))
      if (allSelected) {
        indices.forEach((i) => newSet.delete(i))
      } else {
        indices.forEach((i) => newSet.add(i))
      }
      return newSet
    })
  }

  // Column resizing handlers
  const handleMouseDown = (e, field) => {
    e.stopPropagation()
    resizingColumn.current = field
    startX.current = e.clientX
    startWidth.current = columnWidths[field] || e.target.parentElement.offsetWidth

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e) => {
    if (!resizingColumn.current) return

    const diff = e.clientX - startX.current
    const newWidth = Math.max(100, startWidth.current + diff)

    setColumnWidths((prev) => ({
      ...prev,
      [resizingColumn.current]: newWidth,
    }))
  }

  const handleMouseUp = () => {
    resizingColumn.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <div className={`datagrid-container ${loading ? 'loading' : ''}`}>
      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type='checkbox'
                  onChange={toggleAllCurrentPage}
                  checked={
                    pagedRows.length > 0 &&
                    pagedRows
                      .map((_, idx) => page * pageSize + idx)
                      .every((i) => selectedRows.has(i))
                  }
                  disabled={loading}
                />
              </th>
              {columns
                .filter((c) => activeVisibleColumns.has(c.field))
                .map((col) => (
                  <th
                    key={col.field}
                    onClick={() => !loading && toggleSort(col.field)}
                    className={`sortable ${sortConfig.field === col.field ? 'sorted' : ''}`}
                    style={{
                      width: columnWidths[col.field] || 'auto',
                      minWidth: '100px',
                      position: 'relative'
                    }}
                  >
                    {col.headerName}
                    {sortConfig.field === col.field && sortConfig.direction && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleMouseDown(e, col.field)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, rowIdx) => {
              const absoluteIndex = page * pageSize + rowIdx
              return (
                <tr
                  key={absoluteIndex}
                  className={selectedRows.has(absoluteIndex) ? 'selected' : ''}
                >
                  <td className="checkbox-col">
                    <input
                      type='checkbox'
                      checked={selectedRows.has(absoluteIndex)}
                      onChange={() => toggleRowSelection(absoluteIndex)}
                      disabled={loading}
                    />
                  </td>
                  {columns
                    .filter((c) => activeVisibleColumns.has(c.field))
                    .map((col) => {
                      // Special rendering for quality score
                      if (col.field === 'qualityScore' && row.qualityScore != null) {
                        const score = row.qualityScore;
                        const color = row.qualityColor || '#6b7280';
                        return (
                          <td key={col.field}>
                            <span 
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                backgroundColor: `${color}20`,
                                color: color,
                                border: `1px solid ${color}`
                              }}
                            >
                              {Math.round(score)}%
                            </span>
                          </td>
                        );
                      }
                      
                      return (
                        <td key={col.field}>
                          {row[col.field] != null ? String(row[col.field]) : '-'}
                        </td>
                      );
                    })}
                </tr>
              )
            })}

            {pagedRows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={columns.filter(c => activeVisibleColumns.has(c.field)).length + 1}
                  className="no-data-row"
                >
                  📭 No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-wrapper">
        <div className="pagination-info">
          Page {page + 1} of {totalPages}
          <span className="total-count">({rows.length} total rows)</span>
        </div>
        <div className="pagination-controls">
          <button 
            onClick={() => setPage((p) => Math.max(p - 1, 0))} 
            disabled={page === 0 || loading}
            className="pagination-button"
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={page >= totalPages - 1 || loading}
            className="pagination-button"
          >
            Next →
          </button>
          <span className="page-size-label">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(0)
              setPageSize(Number(e.target.value))
            }}
            disabled={loading}
            className="page-size-select"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {exportButtons && (
            <div className="export-buttons-wrapper">
              {exportButtons}
            </div>
          )}
        </div>
      </div>

      {/* Selection info */}
      {selectedRows.size > 0 && (
        <div className="selection-info">
          ✓ {selectedRows.size} row(s) selected
        </div>
      )}
    </div>
  )
}
