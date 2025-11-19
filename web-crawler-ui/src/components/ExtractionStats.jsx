// src/components/ExtractionStats.jsx
import './ExtractionStats.css';

export function ExtractionStats({ locations }) {
  if (!locations || locations.length === 0) {
    return null;
  }

  // Calculate statistics
  const stats = {
    total: locations.length,
    byConfidence: {
      high: 0,
      mediumHigh: 0,
      medium: 0,
      low: 0,
      unknown: 0
    },
    byMethod: {}
  };

  locations.forEach(loc => {
    // Count by confidence
    const confidence = parseFloat(loc.confidence);
    if (isNaN(confidence)) {
      stats.byConfidence.unknown++;
    } else if (confidence >= 0.90) {
      stats.byConfidence.high++;
    } else if (confidence >= 0.75) {
      stats.byConfidence.mediumHigh++;
    } else if (confidence >= 0.70) {
      stats.byConfidence.medium++;
    } else {
      stats.byConfidence.low++;
    }

    // Count by method
    const method = loc.extractionMethod || 'unknown';
    stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
  });

  const confidencePercent = {
    high: ((stats.byConfidence.high / stats.total) * 100).toFixed(0),
    mediumHigh: ((stats.byConfidence.mediumHigh / stats.total) * 100).toFixed(0),
    medium: ((stats.byConfidence.medium / stats.total) * 100).toFixed(0),
    low: ((stats.byConfidence.low / stats.total) * 100).toFixed(0)
  };

  return (
    <div className="extraction-stats">
      <div className="stats-header">
        <h3>📊 Extraction Statistics</h3>
        <span className="stats-total">{stats.total} locations extracted</span>
      </div>

      {/* Confidence Distribution */}
      <div className="stat-card-full">
        <h4>Confidence Distribution</h4>
        <div className="confidence-bars">
          {stats.byConfidence.high > 0 && (
            <div className="confidence-bar">
              <span className="bar-label">
                <span className="badge-high">HIGH</span>
                <span className="bar-count">{stats.byConfidence.high} ({confidencePercent.high}%)</span>
              </span>
              <div className="bar-track">
                <div className="bar-fill bar-fill-high" style={{ width: `${confidencePercent.high}%` }}></div>
              </div>
            </div>
          )}
          {stats.byConfidence.mediumHigh > 0 && (
            <div className="confidence-bar">
              <span className="bar-label">
                <span className="badge-medium-high">MED-HIGH</span>
                <span className="bar-count">{stats.byConfidence.mediumHigh} ({confidencePercent.mediumHigh}%)</span>
              </span>
              <div className="bar-track">
                <div className="bar-fill bar-fill-medium-high" style={{ width: `${confidencePercent.mediumHigh}%` }}></div>
              </div>
            </div>
          )}
          {stats.byConfidence.medium > 0 && (
            <div className="confidence-bar">
              <span className="bar-label">
                <span className="badge-medium">MEDIUM</span>
                <span className="bar-count">{stats.byConfidence.medium} ({confidencePercent.medium}%)</span>
              </span>
              <div className="bar-track">
                <div className="bar-fill bar-fill-medium" style={{ width: `${confidencePercent.medium}%` }}></div>
              </div>
            </div>
          )}
          {stats.byConfidence.low > 0 && (
            <div className="confidence-bar">
              <span className="bar-label">
                <span className="badge-low">LOW</span>
                <span className="bar-count">{stats.byConfidence.low} ({confidencePercent.low}%)</span>
              </span>
              <div className="bar-track">
                <div className="bar-fill bar-fill-low" style={{ width: `${confidencePercent.low}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
