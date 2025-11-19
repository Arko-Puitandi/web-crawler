const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Stage 3: Structured Data Extraction (BEST SOURCE)
 * Extracts Schema.org JSON-LD and Microdata - the most reliable location source
 */
class StructuredDataExtractorService {
  /**
   * Extract all structured data from page
   * @param {string} html - Page HTML
   * @param {string} url - Page URL
   * @returns {Array} Array of locations with HIGH confidence
   */
  extractStructuredData(html, url) {
    const locations = [];

    // JSON-LD is the gold standard
    locations.push(...this.extractJsonLd(html, url));
    
    // Microdata as fallback
    locations.push(...this.extractMicrodata(html, url));

    logger.info(`📋 Structured data extracted: ${locations.length} locations (HIGH confidence)`);
    return locations;
  }

  /**
   * Extract JSON-LD schema data
   */
  extractJsonLd(html, url) {
    const locations = [];
    
    try {
      const $ = cheerio.load(html);
      
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const jsonData = JSON.parse($(el).html());
          
          // Handle @graph arrays
          const items = jsonData['@graph'] ? jsonData['@graph'] : [jsonData];
          
          for (const item of items) {
            if (this.isLocationSchema(item)) {
              const location = this.parseSchemaObject(item, url);
              if (location) {
                locations.push(location);
              }
            }
          }
        } catch (parseError) {
          logger.warn('Failed to parse JSON-LD:', parseError.message);
        }
      });
    } catch (error) {
      logger.error('Error extracting JSON-LD:', error.message);
    }

    return locations;
  }

  /**
   * Check if schema object represents a location
   */
  isLocationSchema(obj) {
    if (!obj || !obj['@type']) return false;
    
    const type = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
    
    const locationTypes = [
      'LocalBusiness',
      'Organization',
      'Place',
      'PostalAddress',
      'Store',
      'OfficeLocation',
      'CorporateHeadquarters',
      'BusinessPlace',
      'BranchOffice'
    ];

    return type.some(t => locationTypes.some(lt => t.includes(lt)));
  }

  /**
   * Parse schema object into location format
   */
  parseSchemaObject(schema, url) {
    try {
      const location = {
        name: schema.name || schema.legalName || '',
        address: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        lat: null,
        lon: null,
        phone: '',
        email: '',
        source: url,
        extractionMethod: 'json-ld',
        confidence: 0.95 // HIGH confidence
      };

      // Extract address
      if (schema.address) {
        const addr = schema.address;
        if (typeof addr === 'string') {
          location.address = addr;
        } else if (typeof addr === 'object') {
          location.street = addr.streetAddress || '';
          location.city = addr.addressLocality || '';
          location.state = addr.addressRegion || '';
          location.postalCode = addr.postalCode || '';
          location.country = addr.addressCountry || '';
          
          // Construct full address
          const parts = [
            location.street,
            location.city,
            location.state,
            location.postalCode,
            location.country
          ].filter(Boolean);
          location.address = parts.join(', ');
        }
      }

      // Extract coordinates
      if (schema.geo) {
        location.lat = schema.geo.latitude || null;
        location.lon = schema.geo.longitude || null;
      }

      // Extract contact info
      if (schema.telephone) {
        location.phone = Array.isArray(schema.telephone) 
          ? schema.telephone[0] 
          : schema.telephone;
      }

      if (schema.email) {
        location.email = Array.isArray(schema.email) 
          ? schema.email[0] 
          : schema.email;
      }

      // Validate location has minimum required data
      if (location.address || (location.lat && location.lon)) {
        return location;
      }

      return null;
    } catch (error) {
      logger.warn('Error parsing schema object:', error.message);
      return null;
    }
  }

  /**
   * Extract Microdata (Schema.org HTML attributes)
   */
  extractMicrodata(html, url) {
    const locations = [];
    
    try {
      const $ = cheerio.load(html);
      
      // Find elements with itemtype for location schemas
      $('[itemtype*="schema.org"]').each((i, el) => {
        const $el = $(el);
        const itemType = $el.attr('itemtype');
        
        if (this.isLocationMicrodata(itemType)) {
          const location = this.parseMicrodataItem($el, url);
          if (location) {
            locations.push(location);
          }
        }
      });
    } catch (error) {
      logger.error('Error extracting Microdata:', error.message);
    }

    return locations;
  }

  /**
   * Check if microdata itemtype is location-related
   */
  isLocationMicrodata(itemType) {
    if (!itemType) return false;
    
    const locationTypes = [
      'LocalBusiness',
      'Organization',
      'Place',
      'PostalAddress'
    ];

    return locationTypes.some(type => itemType.includes(type));
  }

  /**
   * Parse microdata item
   */
  parseMicrodataItem($el, url) {
    try {
      const location = {
        name: this.getMicrodataProp($el, 'name'),
        address: '',
        street: this.getMicrodataProp($el, 'streetAddress'),
        city: this.getMicrodataProp($el, 'addressLocality'),
        state: this.getMicrodataProp($el, 'addressRegion'),
        postalCode: this.getMicrodataProp($el, 'postalCode'),
        country: this.getMicrodataProp($el, 'addressCountry'),
        lat: this.getMicrodataProp($el, 'latitude'),
        lon: this.getMicrodataProp($el, 'longitude'),
        phone: this.getMicrodataProp($el, 'telephone'),
        email: this.getMicrodataProp($el, 'email'),
        source: url,
        extractionMethod: 'microdata',
        confidence: 0.90 // HIGH confidence
      };

      // Construct address from components
      const parts = [
        location.street,
        location.city,
        location.state,
        location.postalCode,
        location.country
      ].filter(Boolean);
      
      location.address = parts.join(', ');

      // Validate
      if (location.address || (location.lat && location.lon)) {
        return location;
      }

      return null;
    } catch (error) {
      logger.warn('Error parsing microdata:', error.message);
      return null;
    }
  }

  /**
   * Helper to get microdata property value
   */
  getMicrodataProp($el, propName) {
    const $prop = $el.find(`[itemprop="${propName}"]`).first();
    if (!$prop.length) return '';
    
    // Check for content attribute first
    if ($prop.attr('content')) {
      return $prop.attr('content');
    }
    
    return $prop.text().trim();
  }
}

module.exports = new StructuredDataExtractorService();
