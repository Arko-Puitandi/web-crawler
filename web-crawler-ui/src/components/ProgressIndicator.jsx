import React, { useEffect, useState } from 'react';
import { API_CONFIG } from '../config/api';

export const ProgressIndicator = ({ jobId, onComplete }) => {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROGRESS}/${jobId}/stream`
    );

    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'progress' || message.type === 'connected') {
          setProgress(message.data);
        } else if (message.type === 'complete') {
          setProgress(message.data);
          eventSource.close();
          if (onComplete) {
            onComplete(message.data);
          }
        } else if (message.type === 'error') {
          setError(message.data.error);
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete]);

  if (!progress) {
    return (
      <div className="progress-indicator">
        <div className="spinner"></div>
        <p>Initializing crawl...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-indicator error">
        <span className="error-icon">❌</span>
        <p>Error: {error}</p>
      </div>
    );
  }

  const { status, progress: percentage, pagesProcessed, totalPages, locationsFound, currentPage } = progress;

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3>
          {status === 'completed' ? '✅ Crawl Complete' : '🕷️ Crawling in Progress'}
        </h3>
        <span className="progress-percentage">{percentage || 0}%</span>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage || 0}%` }}
        />
      </div>

      <div className="progress-details">
        <div className="progress-stat">
          <span className="stat-label">Pages:</span>
          <span className="stat-value">{pagesProcessed || 0} / {totalPages || '?'}</span>
        </div>
        <div className="progress-stat">
          <span className="stat-label">Locations:</span>
          <span className="stat-value">{locationsFound || 0}</span>
        </div>
      </div>

      {currentPage && status !== 'completed' && (
        <div className="current-page">
          <span className="page-label">Current:</span>
          <span className="page-url" title={currentPage}>
            {currentPage.length > 50 ? currentPage.substring(0, 50) + '...' : currentPage}
          </span>
        </div>
      )}

      <style jsx>{`
        .progress-indicator {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 20px 0;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .progress-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .progress-percentage {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2563eb;
        }

        .progress-bar-container {
          width: 100%;
          height: 12px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #2563eb);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .progress-details {
          display: flex;
          gap: 24px;
          margin-bottom: 12px;
        }

        .progress-stat {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-label {
          font-weight: 600;
          color: #6b7280;
        }

        .stat-value {
          font-weight: 700;
          color: #1f2937;
          font-size: 1.125rem;
        }

        .current-page {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .page-label {
          font-weight: 600;
          color: #6b7280;
        }

        .page-url {
          color: #2563eb;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }

        .error-icon {
          font-size: 3rem;
          display: block;
          text-align: center;
          margin-bottom: 12px;
        }

        .progress-indicator.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .progress-indicator.error p {
          color: #dc2626;
          text-align: center;
          font-weight: 600;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
