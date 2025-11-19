import { useState, useEffect } from 'react';
import './ExtractionProgress.css';

export function ExtractionProgress({ isLoading, extractionStage = 'Initializing' }) {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  // Animated dots
  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Simulate progress
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          return prev + Math.random() * 3;
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="extraction-progress-compact">
      <div className="progress-spinner"></div>
      <div className="progress-content">
        <div className="progress-text">
          <span className="progress-icon">🌐</span>
          <span className="progress-message">Extracting locations{dots}</span>
          <span className="progress-percentage">{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-subtext">This may take 30-60 seconds...</div>
      </div>
    </div>
  );
}
