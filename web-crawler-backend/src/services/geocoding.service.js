const { Client } = require('@googlemaps/google-maps-services-js');
const opencage = require('opencage-api-client');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');

class GeocodingService {
  constructor() {
    this.client = new Client({});
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.opencageApiKey = process.env.OPENCAGE_API_KEY || '5062a38211be4c8495b8e1aa4c735087';
  }

  async geocodeAddress(address) {
    // Check cache first
    const cacheKey = `geo:${address}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // Try OpenCage first (more generous free tier)
    try {
      const opencageResult = await this.geocodeWithOpencage(address);
      if (opencageResult && opencageResult.latitude && opencageResult.longitude) {
        // Cache result for 30 days
        await cacheService.set(cacheKey, opencageResult, 2592000);
        return opencageResult;
      }
    } catch (error) {
      logger.warn(`OpenCage geocoding failed for ${address}:`, error.message);
    }

    // Fallback to Google Maps
    try {
      if (!this.googleApiKey) {
        logger.warn('Google Maps API key not configured, returning empty geo data');
        return this.getEmptyGeoData(address);
      }

      const response = await this.client.geocode({
        params: {
          address: address,
          key: this.googleApiKey
        }
      });

      if (response.data.results.length === 0) {
        throw new Error('No results found');
      }

      const result = response.data.results[0];
      const components = this.parseAddressComponents(result.address_components);

      const geoData = {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat.toString(),
        longitude: result.geometry.location.lng.toString(),
        city: components.city,
        state: components.state,
        postalCode: components.postalCode,
        countryCode: components.countryCode
      };

      // Cache result for 30 days
      await cacheService.set(cacheKey, geoData, 2592000);

      return geoData;

    } catch (error) {
      logger.error(`Geocoding error for ${address}:`, error.message);
      return this.getEmptyGeoData(address);
    }
  }

  async geocodeWithOpencage(address) {
    try {
      const response = await opencage.geocode({ q: address, key: this.opencageApiKey });

      if (!response || !response.results || response.results.length === 0) {
        throw new Error('No results from OpenCage');
      }

      const result = response.results[0];
      const components = result.components;

      return {
        formattedAddress: result.formatted,
        latitude: result.geometry.lat.toString(),
        longitude: result.geometry.lng.toString(),
        city: components.city || components.town || components.village || '',
        state: components.state || components.state_code || '',
        postalCode: components.postcode || '',
        countryCode: this.iso2ToIso3(components.country_code?.toUpperCase() || ''),
        provider: 'opencage'
      };
    } catch (error) {
      throw new Error(`OpenCage geocoding failed: ${error.message}`);
    }
  }

  parseAddressComponents(components) {
    const parsed = {
      city: '',
      state: '',
      postalCode: '',
      countryCode: ''
    };

    components.forEach(component => {
      if (component.types.includes('locality')) {
        parsed.city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        parsed.state = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      }
      if (component.types.includes('country')) {
        // Convert ISO2 to ISO3 (e.g., US -> USA)
        parsed.countryCode = this.iso2ToIso3(component.short_name);
      }
    });

    return parsed;
  }

  iso2ToIso3(iso2) {
    // Common ISO2 to ISO3 conversions
    const mapping = {
      'US': 'USA', 'GB': 'GBR', 'CA': 'CAN', 'AU': 'AUS', 'DE': 'DEU',
      'FR': 'FRA', 'IT': 'ITA', 'ES': 'ESP', 'NL': 'NLD', 'BE': 'BEL',
      'CH': 'CHE', 'AT': 'AUT', 'SE': 'SWE', 'NO': 'NOR', 'DK': 'DNK',
      'FI': 'FIN', 'PL': 'POL', 'CZ': 'CZE', 'IE': 'IRL', 'PT': 'PRT',
      'GR': 'GRC', 'HU': 'HUN', 'RO': 'ROU', 'BG': 'BGR', 'HR': 'HRV',
      'SI': 'SVN', 'SK': 'SVK', 'LT': 'LTU', 'LV': 'LVA', 'EE': 'EST',
      'IS': 'ISL', 'LU': 'LUX', 'MT': 'MLT', 'CY': 'CYP', 'JP': 'JPN',
      'CN': 'CHN', 'IN': 'IND', 'KR': 'KOR', 'SG': 'SGP', 'MY': 'MYS',
      'TH': 'THA', 'ID': 'IDN', 'PH': 'PHL', 'VN': 'VNM', 'NZ': 'NZL',
      'MX': 'MEX', 'BR': 'BRA', 'AR': 'ARG', 'CL': 'CHL', 'CO': 'COL',
      'PE': 'PER', 'VE': 'VEN', 'ZA': 'ZAF', 'NG': 'NGA', 'EG': 'EGY',
      'KE': 'KEN', 'SA': 'SAU', 'AE': 'ARE', 'IL': 'ISR', 'TR': 'TUR',
      'RU': 'RUS', 'UA': 'UKR', 'BY': 'BLR', 'KZ': 'KAZ', 'UZ': 'UZB'
    };
    return mapping[iso2] || iso2;
  }

  getEmptyGeoData(address) {
    return {
      formattedAddress: address,
      latitude: '',
      longitude: '',
      city: '',
      state: '',
      postalCode: '',
      countryCode: ''
    };
  }
}

module.exports = new GeocodingService();
