const cheerio = require('cheerio');
const logger = require('../utils/logger');

class MapDetectorService {
  /**
   * Detect map iframes and links in HTML
   * @param {string} html - HTML content
   * @param {string} baseUrl - Base URL for resolving relative URLs
   * @returns {Array} - Array of detected maps with coordinates
   */
  detectMapIframes(html, baseUrl) {
    const $ = cheerio.load(html);
    const maps = [];

    // Detect map iframes
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (!src) return;

      const srcLower = src.toLowerCase();
      if (
        srcLower.includes('google.com/maps') ||
        srcLower.includes('bing.com/maps') ||
        srcLower.includes('openstreetmap') ||
        srcLower.includes('mapbox') ||
        srcLower.includes('maps.app.goo.gl') ||
        srcLower.includes('leafletjs')
      ) {
        const fullSrc = this.normalizeUrl(src, baseUrl);
        const coords = this.extractCoordsFromMapUrl(fullSrc);
        
        maps.push({
          type: 'iframe',
          src: fullSrc,
          coordinates: coords,
          provider: this.detectMapProvider(srcLower)
        });
      }
    });

    // Detect map links
    $('a[href*="maps"], a[href*="directions"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const hrefLower = href.toLowerCase();
      
      if (hrefLower.includes('google.com/maps') || hrefLower.includes('maps.app.goo.gl')) {
        const fullHref = this.normalizeUrl(href, baseUrl);
        const coords = this.extractCoordsFromMapUrl(fullHref);
        
        if (coords) {
          maps.push({
            type: 'link',
            src: fullHref,
            coordinates: coords,
            provider: 'google',
            text: $(el).text().trim()
          });
        }
      }
    });

    logger.info(`Detected ${maps.length} map(s) in HTML`);
    return maps;
  }

  /**
   * Extract coordinates from map URLs
   * @param {string} urlStr - Map URL
   * @returns {Object|null} - { lat, lon } or null
   */
  extractCoordsFromMapUrl(urlStr) {
    if (!urlStr) return null;

    try {
      const u = new URL(urlStr);
      const fullPath = u.pathname + u.search + u.hash;

      // Google Maps patterns:
      // 1. /@lat,lon format: /@37.7749,-122.4194
      let match = fullPath.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (match) {
        return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
      }

      // 2. !3d!4d format: !3d37.7749!4d-122.4194
      match = fullPath.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (match) {
        return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
      }

      // 3. Query parameter 'q': ?q=37.7749,-122.4194
      if (u.searchParams.has('q')) {
        const q = u.searchParams.get('q');
        match = q.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
          return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
        }
      }

      // 4. Query parameter 'center': ?center=37.7749,-122.4194
      if (u.searchParams.has('center')) {
        const center = u.searchParams.get('center').split(',');
        if (center.length === 2) {
          return { lat: parseFloat(center[0]), lon: parseFloat(center[1]) };
        }
      }

      // 5. Query parameters 'lat' and 'lon' or 'lng'
      if (u.searchParams.has('lat') && (u.searchParams.has('lon') || u.searchParams.has('lng'))) {
        return {
          lat: parseFloat(u.searchParams.get('lat')),
          lon: parseFloat(u.searchParams.get('lon') || u.searchParams.get('lng'))
        };
      }

      // 6. OpenStreetMap format: ?mlat=lat&mlon=lon
      if (u.searchParams.has('mlat') && u.searchParams.has('mlon')) {
        return {
          lat: parseFloat(u.searchParams.get('mlat')),
          lon: parseFloat(u.searchParams.get('mlon'))
        };
      }

    } catch (error) {
      logger.warn(`Error extracting coordinates from URL ${urlStr}:`, error.message);
    }

    return null;
  }

  /**
   * Detect data-* attributes with coordinates
   * @param {string} html - HTML content
   * @returns {Array} - Array of coordinates found
   */
  detectDataAttributes(html) {
    const $ = cheerio.load(html);
    const coords = [];

    // Look for common data attributes
    $('[data-lat], [data-latitude], [data-location]').each((i, el) => {
      const lat = $(el).attr('data-lat') || $(el).attr('data-latitude');
      const lon = $(el).attr('data-lon') || $(el).attr('data-lng') || $(el).attr('data-longitude');

      if (lat && lon) {
        coords.push({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          element: $(el).prop('tagName'),
          id: $(el).attr('id'),
          class: $(el).attr('class')
        });
      }

      // Check data-location attribute (sometimes JSON)
      const location = $(el).attr('data-location');
      if (location) {
        try {
          const parsed = JSON.parse(location);
          if (parsed.lat && parsed.lon) {
            coords.push({ lat: parsed.lat, lon: parsed.lon });
          }
        } catch (e) {
          // Not JSON, try parsing as "lat,lon"
          const match = location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
          if (match) {
            coords.push({ lat: parseFloat(match[1]), lon: parseFloat(match[2]) });
          }
        }
      }
    });

    logger.info(`Detected ${coords.length} coordinate(s) from data attributes`);
    return coords;
  }

  /**
   * Normalize URL (resolve relative URLs)
   * @param {string} url - URL to normalize
   * @param {string} base - Base URL
   * @returns {string} - Normalized URL
   */
  normalizeUrl(url, base) {
    try {
      return new URL(url, base).toString().split('#')[0];
    } catch (error) {
      return url;
    }
  }

  /**
   * Detect map provider from URL
   * @param {string} url - Map URL (lowercase)
   * @returns {string} - Provider name
   */
  detectMapProvider(url) {
    if (url.includes('google.com/maps') || url.includes('maps.app.goo.gl')) return 'google';
    if (url.includes('bing.com/maps')) return 'bing';
    if (url.includes('openstreetmap')) return 'openstreetmap';
    if (url.includes('mapbox')) return 'mapbox';
    if (url.includes('leaflet')) return 'leaflet';
    return 'unknown';
  }
}

module.exports = new MapDetectorService();
