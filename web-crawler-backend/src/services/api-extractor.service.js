const axios = require('axios');
const logger = require('../utils/logger');

class ApiExtractorService {
  /**
   * Detect and extract from JSON/API endpoints
   */
  async extractFromApiEndpoints(url) {
    const endpoints = this.generatePotentialEndpoints(url);
    const allLocations = [];

    logger.info(`🔍 Searching for API endpoints (${endpoints.length} candidates)`);

    for (const endpoint of endpoints) {
      try {
        const locations = await this.tryExtractFromEndpoint(endpoint);
        if (locations.length > 0) {
          logger.info(`✅ Found ${locations.length} locations from ${endpoint}`);
          allLocations.push(...locations);
        }
      } catch (error) {
        // Silently ignore failed endpoints
        logger.debug(`❌ Failed to extract from ${endpoint}: ${error.message}`);
      }
    }

    return allLocations;
  }

  /**
   * Generate potential API endpoint URLs
   */
  generatePotentialEndpoints(baseUrl) {
    const url = new URL(baseUrl);
    const base = `${url.protocol}//${url.host}`;

    return [
      // Common API patterns
      `${base}/api/locations`,
      `${base}/api/locations.json`,
      `${base}/api/stores`,
      `${base}/api/stores.json`,
      `${base}/api/offices`,
      `${base}/api/offices.json`,
      `${base}/api/branches`,
      `${base}/locations.json`,
      `${base}/stores.json`,
      `${base}/offices.json`,
      `${base}/data/locations.json`,
      `${base}/data/stores.json`,
      
      // WordPress/Common CMS patterns
      `${base}/wp-json/wp/v2/locations`,
      `${base}/wp-json/store-locator/v1/stores`,
      
      // Sitemap with locations
      `${base}/locations-sitemap.xml`,
      
      // GraphQL (if detected)
      `${base}/graphql`,
      `${base}/api/graphql`,
      
      // Store locator specific
      `${base}/store-locator/data`,
      `${base}/store-locator/locations.json`,
      `${base}/storelocator/data.json`
    ];
  }

  /**
   * Try to extract locations from a specific endpoint
   */
  async tryExtractFromEndpoint(endpoint) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        validateStatus: (status) => status === 200
      });

      // Check if response is JSON
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
        return [];
      }

      const data = response.data;
      
      // Try to parse locations from various JSON structures
      return this.parseJsonLocations(data, endpoint);

    } catch (error) {
      return [];
    }
  }

  /**
   * Parse locations from JSON data
   */
  parseJsonLocations(data, sourceUrl) {
    let locations = [];

    // Handle array directly
    if (Array.isArray(data)) {
      locations = data.map(item => this.normalizeJsonLocation(item, sourceUrl));
    }
    // Handle nested structures
    else if (typeof data === 'object') {
      // Common nesting patterns
      const possibleKeys = [
        'locations', 'stores', 'offices', 'branches', 
        'data', 'results', 'items', 'features'
      ];

      for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
          locations = data[key].map(item => this.normalizeJsonLocation(item, sourceUrl));
          break;
        }
      }

      // GeoJSON format
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        locations = data.features.map(feature => 
          this.normalizeGeoJsonFeature(feature, sourceUrl)
        );
      }
    }

    return locations.filter(loc => loc !== null);
  }

  /**
   * Normalize a JSON location object
   */
  normalizeJsonLocation(item, sourceUrl) {
    if (!item || typeof item !== 'object') return null;

    // Try to extract key fields with various naming conventions
    const location = {
      locationName: this.extractField(item, [
        'name', 'title', 'storeName', 'locationName', 
        'officeName', 'branchName', 'store_name'
      ]),
      locationAddress: this.extractAddress(item),
      streetOrCity: this.extractField(item, [
        'city', 'town', 'locality', 'street_city'
      ]),
      state: this.extractField(item, [
        'state', 'region', 'province', 'stateProvince'
      ]),
      postcode: this.extractField(item, [
        'postcode', 'zipCode', 'zip', 'postalCode', 'postal_code', 'zip_code'
      ]),
      countryIso3: this.extractCountry(item),
      latitude: this.extractCoordinate(item, ['latitude', 'lat', 'y']),
      longitude: this.extractCoordinate(item, ['longitude', 'lng', 'lon', 'x']),
      phone: this.extractField(item, [
        'phone', 'telephone', 'tel', 'phoneNumber', 'phone_number'
      ]),
      email: this.extractField(item, ['email', 'mail', 'emailAddress']),
      hours: this.extractField(item, [
        'hours', 'openingHours', 'businessHours', 'opening_hours'
      ]),
      website: this.extractField(item, ['website', 'url', 'link']),
      sourceUrl: sourceUrl,
      sourceType: 'API/JSON'
    };

    // Only return if we have at least name or address
    if (!location.locationName && !location.locationAddress) {
      return null;
    }

    return location;
  }

  /**
   * Normalize GeoJSON feature
   */
  normalizeGeoJsonFeature(feature, sourceUrl) {
    if (!feature.geometry || !feature.properties) return null;

    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    return {
      locationName: props.name || props.title,
      locationAddress: props.address || props.description,
      streetOrCity: props.city || props.locality,
      state: props.state || props.region,
      postcode: props.postcode || props.zipCode,
      countryIso3: this.normalizeCountryCode(props.country),
      latitude: coords[1]?.toString(),
      longitude: coords[0]?.toString(),
      phone: props.phone || props.telephone,
      email: props.email,
      sourceUrl: sourceUrl,
      sourceType: 'GeoJSON'
    };
  }

  /**
   * Extract field with multiple possible keys
   */
  extractField(obj, keys) {
    for (const key of keys) {
      if (obj[key]) return obj[key].toString();
    }
    return '';
  }

  /**
   * Extract address from various formats
   */
  extractAddress(obj) {
    // Full address field
    const addressKeys = [
      'address', 'fullAddress', 'street_address', 
      'streetAddress', 'location', 'addr'
    ];
    
    for (const key of addressKeys) {
      if (obj[key]) return obj[key].toString();
    }

    // Construct from parts
    const parts = [];
    const addressParts = ['street', 'street1', 'address1', 'line1'];
    const cityParts = ['city', 'town', 'locality'];
    const stateParts = ['state', 'region', 'province'];
    const zipParts = ['postcode', 'zip', 'zipCode', 'postal_code'];

    const street = this.extractField(obj, addressParts);
    const city = this.extractField(obj, cityParts);
    const state = this.extractField(obj, stateParts);
    const zip = this.extractField(obj, zipParts);

    if (street) parts.push(street);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zip) parts.push(zip);

    return parts.join(', ');
  }

  /**
   * Extract coordinate
   */
  extractCoordinate(obj, keys) {
    for (const key of keys) {
      if (obj[key] != null) {
        const val = parseFloat(obj[key]);
        return isNaN(val) ? '' : val.toString();
      }
    }
    return '';
  }

  /**
   * Extract and normalize country code
   */
  extractCountry(obj) {
    const country = this.extractField(obj, [
      'country', 'countryCode', 'country_code', 'countryISO'
    ]);
    return this.normalizeCountryCode(country);
  }

  /**
   * Normalize country code to ISO3
   */
  normalizeCountryCode(code) {
    if (!code) return '';
    
    const iso2to3 = {
      'US': 'USA', 'GB': 'GBR', 'DE': 'DEU', 'FR': 'FRA', 'IT': 'ITA',
      'ES': 'ESP', 'NL': 'NLD', 'BE': 'BEL', 'CA': 'CAN', 'AU': 'AUS',
      'JP': 'JPN', 'CN': 'CHN', 'IN': 'IND', 'BR': 'BRA', 'MX': 'MEX'
    };

    const normalized = code.toUpperCase().trim();
    
    // Already ISO3
    if (normalized.length === 3) return normalized;
    
    // Convert ISO2 to ISO3
    if (normalized.length === 2) {
      return iso2to3[normalized] || normalized;
    }

    return '';
  }

  /**
   * Detect if URL might have API endpoints
   */
  async detectApiAvailability(url) {
    const testEndpoints = [
      '/api/locations.json',
      '/locations.json',
      '/api/stores.json'
    ];

    const base = new URL(url);
    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.head(`${base.protocol}//${base.host}${endpoint}`, {
          timeout: 5000
        });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Continue checking
      }
    }
    return false;
  }
}

module.exports = new ApiExtractorService();
