import React, { useEffect, useRef, useState } from 'react';

export const MapVisualization = ({ locations, onMarkerClick }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [error, setError] = useState(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Check if we have a valid API key
    const apiKey = 'AIzaSyBGWFYA2Uj_bacVlnkiXv3GN3kJ2RbDd5I';
    if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setError('Please configure Google Maps API key');
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    
    // Load Google Maps script only once
    if (!window.google && !existingScript && !scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => setError('Failed to load Google Maps');
      document.head.appendChild(script);
    } else if (window.google?.maps) {
      initializeMap();
    }

    return () => {
      // Cleanup markers on unmount
      if (markers.length > 0) {
        markers.forEach(marker => marker.setMap(null));
      }
    };
  }, []);

  useEffect(() => {
    if (map && locations) {
      updateMarkers();
    }
  }, [map, locations]);

  const initializeMap = () => {
    // Use requestAnimationFrame to wait for DOM to be fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mapRef.current || !window.google?.maps) return;
        
        // Check if element is actually in the DOM
        if (!document.body.contains(mapRef.current)) return;

        try {
          const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // NYC
          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 4,
            mapId: 'DEMO_MAP_ID', // Add mapId to prevent errors
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });

          setMap(mapInstance);
        } catch (err) {
          console.error('Error initializing map:', err);
          setError('Failed to initialize map');
        }
      });
    });
  };

  const updateMarkers = () => {
    if (!map || !window.google?.maps) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    if (!locations || locations.length === 0) return;

    try {
      const bounds = new window.google.maps.LatLngBounds();
      const newMarkers = [];

    locations.forEach((location, index) => {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const position = { lat, lng };
      
      // Color code by quality score
      let markerColor = '#3b82f6'; // blue default
      if (location.qualityScore >= 90) markerColor = '#10b981'; // green
      else if (location.qualityScore >= 70) markerColor = '#3b82f6'; // blue
      else if (location.qualityScore >= 50) markerColor = '#f59e0b'; // orange
      else if (location.qualityScore) markerColor = '#ef4444'; // red

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: location.locationName || location.locationAddress,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: markerColor,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(location)
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (onMarkerClick) {
          onMarkerClick(location, index);
        }
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      
      // Adjust zoom if only one marker
      if (newMarkers.length === 1) {
        map.setZoom(12);
      }
    }
    } catch (err) {
      console.error('Error updating markers:', err);
    }
  };

  const createInfoWindowContent = (location) => {
    const quality = location.qualityScore 
      ? `<div style="margin-top: 8px; padding: 4px 8px; background: ${location.qualityColor}20; border: 1px solid ${location.qualityColor}; border-radius: 4px; display: inline-block;">
           <strong style="color: ${location.qualityColor};">Quality: ${Math.round(location.qualityScore)}%</strong>
         </div>`
      : '';

    const phone = location.phone 
      ? `<div style="margin-top: 4px;">📞 ${Array.isArray(location.phone) ? location.phone.join(', ') : location.phone}</div>`
      : '';

    const email = location.email
      ? `<div style="margin-top: 4px;">✉️ ${Array.isArray(location.email) ? location.email[0] : location.email}</div>`
      : '';

    const hours = location.hours
      ? `<div style="margin-top: 4px;">🕒 ${Array.isArray(location.hours) ? location.hours[0] : location.hours}</div>`
      : '';

    return `
      <div style="max-width: 300px; padding: 8px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1f2937;">
          ${location.locationName || 'Location'}
        </h3>
        <div style="color: #6b7280; font-size: 14px;">
          📍 ${location.locationAddress || 'Address not available'}
        </div>
        ${phone}
        ${email}
        ${hours}
        ${quality}
      </div>
    `;
  };

  const handleRecenter = () => {
    if (map && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
    }
  };

  const handleZoomIn = () => {
    if (map) map.setZoom(map.getZoom() + 1);
  };

  const handleZoomOut = () => {
    if (map) map.setZoom(map.getZoom() - 1);
  };

  if (error) {
    return (
      <div className="map-error">
        <p>⚠️ {error}</p>
        <p>Please configure Google Maps API key</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div ref={mapRef} className="map" style={{ width: '100%', height: '500px' }} />
      
      <div className="map-controls">
        <button onClick={handleRecenter} className="map-btn" title="Recenter">
          🎯
        </button>
        <button onClick={handleZoomIn} className="map-btn" title="Zoom In">
          ➕
        </button>
        <button onClick={handleZoomOut} className="map-btn" title="Zoom Out">
          ➖
        </button>
      </div>

      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#10b981' }}></span>
          <span>Excellent (90%+)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
          <span>Good (70-89%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
          <span>Fair (50-69%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ef4444' }}></span>
          <span>Poor (&lt;50%)</span>
        </div>
      </div>


    </div>
  );
};
