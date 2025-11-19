// src/components/LocationDetailModal.jsx
import { useState } from 'react';
import './LocationDetailModal.css';

export default function LocationDetailModal({ location, onClose }) {
  const [activeTab, setActiveTab] = useState('details');

  if (!location) return null;

  const renderQualityBadge = (score) => {
    if (!score) return <span className="badge badge-gray">No Score</span>;
    
    const scoreNum = parseFloat(score);
    let className = 'badge badge-';
    let label = '';

    if (scoreNum >= 90) {
      className += 'green';
      label = 'Excellent';
    } else if (scoreNum >= 70) {
      className += 'blue';
      label = 'Good';
    } else if (scoreNum >= 50) {
      className += 'yellow';
      label = 'Fair';
    } else {
      className += 'red';
      label = 'Poor';
    }

    return (
      <span className={className}>
        {scoreNum}% - {label}
      </span>
    );
  };

  const renderField = (label, value, isArray = false) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return (
        <div className="detail-field">
          <label className="field-label">{label}</label>
          <span className="field-value field-empty">Not available</span>
        </div>
      );
    }

    if (isArray) {
      return (
        <div className="detail-field">
          <label className="field-label">{label}</label>
          <div className="field-value-list">
            {value.map((item, idx) => (
              <span key={idx} className="field-value-item">{item}</span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="detail-field">
        <label className="field-label">{label}</label>
        <span className="field-value">{value}</span>
      </div>
    );
  };

  const renderMap = () => {
    const lat = location.latitude;
    const lon = location.longitude;

    if (!lat || !lon) {
      return (
        <div className="map-placeholder">
          <p>📍 Coordinates not available for map display</p>
        </div>
      );
    }

    // Using standard embed URL with marker and satellite view
    const mapUrl = `https://www.google.com/maps?q=${lat},${lon}&hl=en&z=18&output=embed&t=k`;

    return (
      <div className="map-container">
        <iframe
          src={mapUrl}
          width="100%"
          height="400"
          style={{ border: 0 }}
          loading="lazy"
          title="Location Map"
        ></iframe>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-center" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-area">
            <span className="location-icon">📍</span>
            <div>
              <h2 className="modal-title">
                {location.locationName || location.name || 'Location Details'}
              </h2>
              <p className="modal-subtitle">
                {location.streetOrCity || location.city}, {location.state || location.region}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-single">
          {/* Left Side - Details */}
          <div className="details-column">
            <div className="info-group">
              <h3 className="info-title">Location Details</h3>
              {renderField('Address', location.locationAddress || location.address)}
              {renderField('City', location.streetOrCity || location.city)}
              {renderField('State', location.state || location.region)}
              {renderField('Postcode', location.postcode || location.postalCode)}
              {renderField('Country', location.countryIso3 || location.countryCode)}
            </div>

            <div className="info-group">
              <h3 className="info-title">Additional Info</h3>
              {renderField('Activity', location.activityAtAsset || location.activity)}
              {renderField('Latitude', location.latitude)}
              {renderField('Longitude', location.longitude)}
            </div>

            {(location.phone || location.email || location.website) && (
              <div className="info-group">
                <h3 className="info-title">Contact</h3>
                {location.phone && renderField('Phone', location.phone)}
                {location.email && renderField('Email', location.email)}
                {location.website && renderField('Website', location.website)}
              </div>
            )}
          </div>

          {/* Right Side - Map */}
          <div className="map-column">
            {renderMap()}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
