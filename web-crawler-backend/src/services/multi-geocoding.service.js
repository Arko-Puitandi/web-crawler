const axios = require('axios');
const logger = require('../utils/logger');

class MultiGeocodingService {
  /**
   * Geocode using multiple services with fallback
   */
  async geocodeWithFallback(address) {
    // Try services in order
    const services = [
      { name: 'Google Maps', fn: () => this.geocodeWithGoogle(address) },
      { name: 'Nominatim', fn: () => this.geocodeWithNominatim(address) },
      { name: 'MapQuest', fn: () => this.geocodeWithMapQuest(address) }
    ];

    for (const service of services) {
      try {
        logger.info(`   Trying ${service.name}...`);
        const result = await service.fn();
        if (result.latitude && result.longitude) {
          logger.info(`   ✓ Success with ${service.name}`);
          return result;
        }
      } catch (error) {
        logger.warn(`   ✗ ${service.name} failed: ${error.message}`);
      }
    }

    logger.warn(`   ✗ All geocoding services failed for: ${address}`);
    return this.getEmptyResult();
  }

  /**
   * Google Maps Geocoding
   */
  async geocodeWithGoogle(address) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: apiKey
      },
      timeout: 10000
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      return this.parseGoogleResult(result, location);
    }

    throw new Error(`Google geocoding failed: ${response.data.status}`);
  }

  /**
   * OpenStreetMap Nominatim (Free, no API key needed)
   */
  async geocodeWithNominatim(address) {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        addressdetails: 1,
        limit: 1
      },
      headers: {
        'User-Agent': 'WebCrawler/1.0'
      },
      timeout: 10000
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return this.parseNominatimResult(result);
    }

    throw new Error('Nominatim geocoding returned no results');
  }

  /**
   * MapQuest Geocoding (backup option)
   */
  async geocodeWithMapQuest(address) {
    // Free tier available
    const apiKey = process.env.MAPQUEST_API_KEY;
    if (!apiKey) {
      throw new Error('MapQuest API key not configured');
    }

    const response = await axios.get('https://www.mapquestapi.com/geocoding/v1/address', {
      params: {
        key: apiKey,
        location: address
      },
      timeout: 10000
    });

    if (response.data.results && response.data.results[0].locations.length > 0) {
      const location = response.data.results[0].locations[0];
      return this.parseMapQuestResult(location);
    }

    throw new Error('MapQuest geocoding returned no results');
  }

  /**
   * Reverse Geocoding - get address from coordinates
   */
  async reverseGeocode(lat, lng) {
    try {
      // Try Google first
      if (process.env.GOOGLE_MAPS_API_KEY) {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            latlng: `${lat},${lng}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          },
          timeout: 10000
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          return {
            formattedAddress: result.formatted_address,
            ...this.parseGoogleResult(result, result.geometry.location)
          };
        }
      }

      // Fallback to Nominatim
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: lat,
          lon: lng,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'WebCrawler/1.0'
        },
        timeout: 10000
      });

      if (response.data) {
        return {
          formattedAddress: response.data.display_name,
          ...this.parseNominatimResult(response.data)
        };
      }

    } catch (error) {
      logger.error(`Reverse geocoding failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Get place details (phone, website, hours, etc.)
   */
  async getPlaceDetails(placeId, placeName, address) {
    const details = {
      phone: '',
      website: '',
      hours: '',
      rating: '',
      types: []
    };

    try {
      if (process.env.GOOGLE_MAPS_API_KEY && placeId) {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: placeId,
            fields: 'formatted_phone_number,website,opening_hours,rating,types,business_status',
            key: process.env.GOOGLE_MAPS_API_KEY
          },
          timeout: 10000
        });

        if (response.data.status === 'OK') {
          const result = response.data.result;
          details.phone = result.formatted_phone_number || '';
          details.website = result.website || '';
          details.rating = result.rating || '';
          details.types = result.types || [];
          
          if (result.opening_hours && result.opening_hours.weekday_text) {
            details.hours = result.opening_hours.weekday_text.join('; ');
          }
        }
      }
    } catch (error) {
      logger.warn(`Could not fetch place details: ${error.message}`);
    }

    return details;
  }

  /**
   * Parse Google Maps result
   */
  parseGoogleResult(result, location) {
    const components = result.address_components || [];
    
    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address || '',
      streetNumber: this.getComponent(components, 'street_number'),
      street: this.getComponent(components, 'route'),
      city: this.getComponent(components, 'locality') || 
            this.getComponent(components, 'administrative_area_level_2'),
      state: this.getComponent(components, 'administrative_area_level_1'),
      postcode: this.getComponent(components, 'postal_code'),
      country: this.getComponent(components, 'country'),
      countryCode: this.getComponent(components, 'country', 'short_name'),
      placeId: result.place_id || ''
    };
  }

  /**
   * Parse Nominatim result
   */
  parseNominatimResult(result) {
    const address = result.address || {};
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name || '',
      streetNumber: address.house_number || '',
      street: address.road || '',
      city: address.city || address.town || address.village || '',
      state: address.state || '',
      postcode: address.postcode || '',
      country: address.country || '',
      countryCode: address.country_code ? address.country_code.toUpperCase() : ''
    };
  }

  /**
   * Parse MapQuest result
   */
  parseMapQuestResult(location) {
    return {
      latitude: location.latLng.lat,
      longitude: location.latLng.lng,
      formattedAddress: location.displayLatLng || '',
      streetNumber: location.street || '',
      street: location.street || '',
      city: location.adminArea5 || '',
      state: location.adminArea3 || '',
      postcode: location.postalCode || '',
      country: location.adminArea1 || '',
      countryCode: location.adminArea1 || ''
    };
  }

  /**
   * Get component from Google result
   */
  getComponent(components, type, format = 'long_name') {
    const component = components.find(c => c.types.includes(type));
    return component ? component[format] : '';
  }

  /**
   * Empty result for failed geocoding
   */
  getEmptyResult() {
    return {
      latitude: '',
      longitude: '',
      formattedAddress: '',
      streetNumber: '',
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: '',
      countryCode: ''
    };
  }
}

module.exports = new MultiGeocodingService();
