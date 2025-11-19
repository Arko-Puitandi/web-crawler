import React, { useState, useRef } from 'react';
import { API_CONFIG } from '../config/api';

export const BulkUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    crawlEntireSite: false,
    maxPages: 10,
    maxDepth: 2,
    batchSize: 5
  });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('crawlEntireSite', options.crawlEntireSite);
      formData.append('maxPages', options.maxPages);
      formData.append('maxDepth', options.maxDepth);
      formData.append('batchSize', options.batchSize);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/bulk/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Download the Excel file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-crawl-results-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop a valid CSV file');
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'Company Name,URL\nExample Company,https://example.com\nAnother Company,https://another.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="bulk-upload">
      <div className="upload-header">
        <h2>📦 Bulk Upload</h2>
        <p>Upload a CSV file with multiple URLs to process in batch</p>
      </div>

      <div className="upload-section">
        <div
          className={`dropzone ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
          {file ? (
            <div className="file-info">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{file.name}</div>
                <div className="file-size">
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            </div>
          ) : (
            <div className="dropzone-content">
              <span className="upload-icon">☁️</span>
              <p>Drag & drop CSV file here</p>
              <p className="or-text">or</p>
              <button className="btn-browse">Browse Files</button>
            </div>
          )}
        </div>

        <button onClick={downloadTemplate} className="btn-template">
          📥 Download CSV Template
        </button>
      </div>

      <div className="options-section">
        <h3>Crawl Options</h3>
        
        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.crawlEntireSite}
              onChange={(e) => setOptions({ ...options, crawlEntireSite: e.target.checked })}
            />
            <span>Crawl entire site (discover all pages)</span>
          </label>
        </div>

        <div className="options-grid">
          <div className="option-group">
            <label>Max Pages per Site</label>
            <input
              type="number"
              min="1"
              max="100"
              value={options.maxPages}
              onChange={(e) => setOptions({ ...options, maxPages: parseInt(e.target.value) })}
            />
          </div>

          <div className="option-group">
            <label>Max Depth</label>
            <input
              type="number"
              min="1"
              max="5"
              value={options.maxDepth}
              onChange={(e) => setOptions({ ...options, maxDepth: parseInt(e.target.value) })}
            />
          </div>

          <div className="option-group">
            <label>Batch Size</label>
            <input
              type="number"
              min="1"
              max="10"
              value={options.batchSize}
              onChange={(e) => setOptions({ ...options, batchSize: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="btn-upload"
      >
        {uploading ? '⏳ Processing...' : '🚀 Upload & Process'}
      </button>

      <div className="info-box">
        <h4>ℹ️ How it works:</h4>
        <ol>
          <li>Upload a CSV file with "Company Name" and "URL" columns</li>
          <li>The crawler will process each URL in batches</li>
          <li>Results will be exported to an Excel file automatically</li>
          <li>The Excel file contains a summary and detailed locations</li>
        </ol>
      </div>

      <style jsx>{`
        .bulk-upload {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .upload-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .upload-header h2 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 2rem;
        }

        .upload-header p {
          color: #6b7280;
          font-size: 1rem;
        }

        .upload-section {
          margin-bottom: 24px;
        }

        .dropzone {
          border: 3px dashed #d1d5db;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          background: #f9fafb;
          margin-bottom: 16px;
        }

        .dropzone:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .dropzone.has-file {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          font-size: 4rem;
        }

        .or-text {
          color: #9ca3af;
          font-weight: 600;
          margin: 8px 0;
        }

        .btn-browse {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-browse:hover {
          background: #2563eb;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 8px;
        }

        .file-icon {
          font-size: 3rem;
        }

        .file-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .file-size {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .btn-template {
          width: 100%;
          padding: 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s;
        }

        .btn-template:hover {
          background: #e5e7eb;
        }

        .options-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .options-section h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }

        .option-group {
          margin-bottom: 16px;
        }

        .option-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .option-group input[type="number"] {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .btn-upload {
          width: 100%;
          padding: 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 24px;
        }

        .btn-upload:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn-upload:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .info-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
        }

        .info-box h4 {
          margin: 0 0 12px 0;
          color: #1e40af;
        }

        .info-box ol {
          margin: 0;
          padding-left: 20px;
          color: #1e3a8a;
        }

        .info-box li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
};
