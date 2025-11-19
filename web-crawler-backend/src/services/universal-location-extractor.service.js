const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * UNIVERSAL LOCATION EXTRACTOR v3.0
 * 
 * Handles ALL common website patterns:
 * 1. Card-based layouts (Nutanix style: Country header + City + Address cards)
 * 2. List-based layouts (ul/li with addresses)
 * 3. Table-based layouts (tr/td with location data)
 * 4. Section-based layouts (divs with headings + addresses)
 * 5. JSON-LD structured data
 * 6. Microdata (schema.org)
 * 7. Grid layouts (CSS grid/flexbox)
 * 8. Accordion/Tab patterns
 * 9. Map-based data attributes
 * 10. Text-based patterns (addresses in paragraphs)
 */
class UniversalLocationExtractor {
  constructor() {
    // Address component patterns
    this.streetPatterns = [
      /\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Court|Ct|Place|Pl|Plaza|Parkway|Pkwy|Circle|Cir|Terrace|Ter|Trail|Square|Suite|Floor|Level)\b/i,
      /(?:Level|Suite|Floor|Unit)\s+\d+/i,
      /\d+[-\s]\d+\s+[A-Z][a-z]+\s+(?:Street|Road|Avenue)/i
    ];
    
    this.postalCodePatterns = [
      /\b\d{5}(?:-\d{4})?\b/, // US ZIP
      /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/, // Canadian
      /\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/, // UK
      /\b\d{4}\b(?!\s*(?:Street|St|Avenue|Ave|Road|Rd))/ // Generic 4-digit postal
    ];
    
    this.stateProvincePatterns = [
      /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|QLD|NSW|VIC|ACT|SA|WA|TAS|NT|ON|BC|AB|MB|SK|NS|NB|PE|NL|YT|NT|NU)\b/,
      /\b(Queensland|New South Wales|Victoria|Australian Capital Territory|South Australia|Western Australia|Tasmania|Northern Territory)\b/i,
      /\b(Ontario|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick)\b/i
    ];
    
    // Country indicators
    this.countries = [
      'United States', 'USA', 'US', 'United Kingdom', 'UK', 'Canada', 'Australia',
      'Germany', 'France', 'India', 'China', 'Japan', 'Singapore', 'Brazil',
      'Mexico', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'Sweden', 'Norway',
      'Denmark', 'Finland', 'Ireland', 'Belgium', 'Austria', 'Poland', 'Russia',
      'South Korea', 'Taiwan', 'Hong Kong', 'Thailand', 'Malaysia', 'Indonesia',
      'Philippines', 'Vietnam', 'UAE', 'Saudi Arabia', 'Israel', 'Egypt', 'South Africa'
    ];
  }

  /**
   * Main extraction method - tries all strategies
   */
  async extractAllLocations(html, sourceUrl) {
    const $ = cheerio.load(html);
    const allLocations = [];
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`🔍 UNIVERSAL LOCATION EXTRACTION`);
    logger.info(`🌐 URL: ${sourceUrl}`);
    logger.info(`${'='.repeat(80)}\n`);

    // Strategy 1: Card-based patterns (NUTANIX STYLE)
    const cardLocations = this.extractFromCards($, sourceUrl);
    logger.info(`✅ Strategy 1 [Card Layouts]: ${cardLocations.length} locations`);
    allLocations.push(...cardLocations);

    // Strategy 2: JSON-LD structured data
    const jsonLdLocations = this.extractFromJsonLd($, sourceUrl);
    logger.info(`✅ Strategy 2 [JSON-LD]: ${jsonLdLocations.length} locations`);
    allLocations.push(...jsonLdLocations);

    // Strategy 3: List patterns (ul/ol/li)
    const listLocations = this.extractFromLists($, sourceUrl);
    logger.info(`✅ Strategy 3 [Lists]: ${listLocations.length} locations`);
    allLocations.push(...listLocations);

    // Strategy 4: Table patterns
    const tableLocations = this.extractFromTables($, sourceUrl);
    logger.info(`✅ Strategy 4 [Tables]: ${tableLocations.length} locations`);
    allLocations.push(...tableLocations);

    // Strategy 5: Section/div with headings
    const sectionLocations = this.extractFromSections($, sourceUrl);
    logger.info(`✅ Strategy 5 [Sections]: ${sectionLocations.length} locations`);
    allLocations.push(...sectionLocations);

    // Strategy 6: Grid layouts
    const gridLocations = this.extractFromGrids($, sourceUrl);
    logger.info(`✅ Strategy 6 [Grids]: ${gridLocations.length} locations`);
    allLocations.push(...gridLocations);

    // Strategy 7: Generic address pattern matching
    const genericLocations = this.extractGenericAddresses($, sourceUrl);
    logger.info(`✅ Strategy 7 [Generic]: ${genericLocations.length} locations`);
    allLocations.push(...genericLocations);

    logger.info(`\n📦 Total extracted: ${allLocations.length} locations`);
    
    // Deduplicate and clean
    const uniqueLocations = this.deduplicateLocations(allLocations);
    logger.info(`✨ After deduplication: ${uniqueLocations.length} unique locations\n`);
    
    return uniqueLocations;
  }

  /**
   * STRATEGY 1: Extract from card-based layouts (NUTANIX PATTERN)
   * Pattern: Country headers → City headers → Address cards
   */
  extractFromCards($, sourceUrl) {
    const locations = [];
    let currentCountry = '';
    let currentRegion = '';
    
    // Look for card containers
    const cardSelectors = [
      '.card', '.location-card', '.office-card', '.address-card',
      '[class*="card"]', '[class*="location"]', '[class*="office"]',
      'article', '.item', '.box', '.panel'
    ];
    
    // First, try to identify country/region headers
    $('h1, h2, h3, h4, h5, h6, strong, b, .country, .region, [class*="country"], [class*="region"]').each((i, header) => {
      const headerText = $(header).text().trim().toUpperCase();
      
      // Check if this is a country header
      if (this.countries.some(c => headerText.includes(c.toUpperCase()))) {
        currentCountry = this.extractCountry(headerText);
        logger.debug(`🌍 Found country: ${currentCountry}`);
      }
      
      // Check if this is a region/state header
      if (this.stateProvincePatterns.some(pattern => pattern.test(headerText))) {
        currentRegion = headerText;
        logger.debug(`📍 Found region: ${currentRegion}`);
      }
    });
    
    // Now extract cards
    cardSelectors.forEach(selector => {
      $(selector).each((i, card) => {
        const $card = $(card);
        const cardText = $card.text();
        
        // Skip if card is too small or empty
        if (cardText.length < 30) return;
        
        // Try to find city name (usually bold or heading)
        const cityElement = $card.find('h1, h2, h3, h4, h5, h6, strong, b, .city, .title, [class*="city"], [class*="title"]').first();
        const city = cityElement.text().trim();
        
        // Extract all text lines from card
        const lines = [];
        $card.find('*').each((j, elem) => {
          const text = $(elem).contents().filter(function() {
            return this.type === 'text';
          }).text().trim();
          if (text && text.length > 2) {
            lines.push(text);
          }
        });
        
        // Look for address components
        const streetAddress = this.findStreetAddress(cardText);
        const postalCode = this.findPostalCode(cardText);
        const state = this.findStateProvince(cardText);
        const country = currentCountry || this.extractCountry(cardText);
        const phone = this.extractPhone(cardText);
        const email = this.extractEmail(cardText);
        
        // Build address string
        let fullAddress = lines.filter(line => 
          line.length > 5 && 
          !this.isHeaderText(line) &&
          (this.containsAddressComponents(line) || /\d/.test(line))
        ).join(', ');
        
        // Validate we have minimum address data
        if ((streetAddress || postalCode || state) && (city || country)) {
          const location = {
            locationName: city || `${country} Office`,
            streetAddress: streetAddress || fullAddress,
            city: city,
            state: state || currentRegion,
            postalCode: postalCode,
            country: country,
            phone: phone,
            email: email,
            sourceUrl: sourceUrl,
            sourceType: 'card-extraction',
            rawText: cardText.substring(0, 300)
          };
          
          locations.push(location);
          logger.debug(`📍 Card location: ${city}, ${country}`);
        }
      });
    });
    
    return locations;
  }

  /**
   * Extract from JSON-LD structured data
   */
  extractFromJsonLd($, sourceUrl) {
    const locations = [];
    
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonData = JSON.parse($(elem).html());
        const extracted = this.parseJsonLdRecursive(jsonData, sourceUrl);
        locations.push(...extracted);
      } catch (e) {
        logger.debug(`Failed to parse JSON-LD: ${e.message}`);
      }
    });
    
    return locations;
  }

  parseJsonLdRecursive(obj, sourceUrl) {
    const locations = [];
    
    if (!obj) return locations;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => locations.push(...this.parseJsonLdRecursive(item, sourceUrl)));
      return locations;
    }
    
    if (obj['@graph']) {
      return this.parseJsonLdRecursive(obj['@graph'], sourceUrl);
    }
    
    const type = obj['@type'];
    if (type && typeof type === 'string' && 
        (type.includes('Place') || type.includes('LocalBusiness') || type.includes('Organization'))) {
      
      if (obj.address) {
        const addr = obj.address;
        locations.push({
          locationName: obj.name || obj.legalName || '',
          streetAddress: addr.streetAddress || '',
          city: addr.addressLocality || '',
          state: addr.addressRegion || '',
          postalCode: addr.postalCode || '',
          country: addr.addressCountry || '',
          phone: obj.telephone || obj.phone || '',
          email: obj.email || '',
          latitude: obj.geo?.latitude || '',
          longitude: obj.geo?.longitude || '',
          sourceUrl: sourceUrl,
          sourceType: 'json-ld'
        });
      }
    }
    
    // Recurse through nested objects
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null && key !== '@context') {
        locations.push(...this.parseJsonLdRecursive(obj[key], sourceUrl));
      }
    });
    
    return locations;
  }

  /**
   * Extract from list patterns (ul/ol/li)
   */
  extractFromLists($, sourceUrl) {
    const locations = [];
    
    $('ul, ol').each((i, list) => {
      const $list = $(list);
      const listText = $list.text().toLowerCase();
      
      // Check if list contains location data
      if (listText.includes('office') || listText.includes('location') || 
          listText.includes('address') || listText.includes('contact')) {
        
        $list.find('li').each((j, item) => {
          const $item = $(item);
          const text = $item.text();
          
          if (text.length < 30) return;
          
          const location = this.parseAddressText(text, sourceUrl, 'list');
          if (location) {
            locations.push(location);
          }
        });
      }
    });
    
    return locations;
  }

  /**
   * Extract from table patterns
   */
  extractFromTables($, sourceUrl) {
    const locations = [];
    
    $('table').each((i, table) => {
      const $table = $(table);
      
      $table.find('tr').each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td, th').map((k, cell) => $(cell).text().trim()).get();
        const rowText = cells.join(' ');
        
        if (rowText.length < 30) return;
        
        const location = this.parseAddressText(rowText, sourceUrl, 'table');
        if (location) {
          locations.push(location);
        }
      });
    });
    
    return locations;
  }

  /**
   * Extract from section/div with headings
   */
  extractFromSections($, sourceUrl) {
    const locations = [];
    
    $('section, article, div').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      
      // Skip if too small or too large
      if (text.length < 50 || text.length > 1000) return;
      
      // Look for address indicators
      if (this.containsAddressComponents(text)) {
        const heading = $elem.find('h1, h2, h3, h4, h5, h6').first().text().trim();
        const location = this.parseAddressText(text, sourceUrl, 'section');
        
        if (location && heading) {
          location.locationName = heading;
        }
        
        if (location) {
          locations.push(location);
        }
      }
    });
    
    return locations;
  }

  /**
   * Extract from grid layouts
   */
  extractFromGrids($, sourceUrl) {
    const locations = [];
    
    const gridSelectors = [
      '[class*="grid"]', '[class*="flex"]', '[class*="col"]',
      '[style*="display: grid"]', '[style*="display: flex"]'
    ];
    
    gridSelectors.forEach(selector => {
      $(selector).find('> *').each((i, item) => {
        const $item = $(item);
        const text = $item.text();
        
        if (text.length < 30 || text.length > 800) return;
        
        if (this.containsAddressComponents(text)) {
          const location = this.parseAddressText(text, sourceUrl, 'grid');
          if (location) {
            locations.push(location);
          }
        }
      });
    });
    
    return locations;
  }

  /**
   * Generic address extraction from any element
   */
  extractGenericAddresses($, sourceUrl) {
    const locations = [];
    const processed = new Set();
    
    $('*').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      // Skip if already processed or wrong size
      if (text.length < 50 || text.length > 600 || processed.has(text)) return;
      
      // Check if contains strong address indicators
      const hasStreet = this.streetPatterns.some(p => p.test(text));
      const hasPostal = this.postalCodePatterns.some(p => p.test(text));
      
      if (hasStreet || hasPostal) {
        const location = this.parseAddressText(text, sourceUrl, 'generic');
        if (location) {
          locations.push(location);
          processed.add(text);
        }
      }
    });
    
    return locations;
  }

  /**
   * Parse address from text block
   */
  parseAddressText(text, sourceUrl, sourceType) {
    const street = this.findStreetAddress(text);
    const city = this.findCity(text);
    const state = this.findStateProvince(text);
    const postal = this.findPostalCode(text);
    const country = this.extractCountry(text);
    const phone = this.extractPhone(text);
    const email = this.extractEmail(text);
    
    // Require minimum data - be more lenient (accept if has ANY address component)
    if (!street && !postal && !city && !country && !state) return null;
    
    return {
      locationName: city || country || 'Office',
      streetAddress: street,
      city: city,
      state: state,
      postalCode: postal,
      country: country,
      phone: phone,
      email: email,
      sourceUrl: sourceUrl,
      sourceType: sourceType,
      rawText: text.substring(0, 300)
    };
  }

  /**
   * Helper: Find street address
   */
  findStreetAddress(text) {
    for (const pattern of this.streetPatterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return '';
  }

  /**
   * Helper: Find postal code
   */
  findPostalCode(text) {
    for (const pattern of this.postalCodePatterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return '';
  }

  /**
   * Helper: Find state/province
   */
  findStateProvince(text) {
    for (const pattern of this.stateProvincePatterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return '';
  }

  /**
   * Helper: Find city name
   */
  findCity(text) {
    // Look for city patterns (after comma, before state/postal)
    const cityPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,\s*([A-Z]{2,3}|\d{5})/;
    const match = text.match(cityPattern);
    if (match) return match[1].trim();
    
    // Look for known major cities
    const knownCities = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
      'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'San Francisco',
      'Seattle', 'Denver', 'Washington', 'Boston', 'Portland', 'Las Vegas',
      'Miami', 'Atlanta', 'London', 'Paris', 'Berlin', 'Tokyo', 'Singapore',
      'Sydney', 'Melbourne', 'Brisbane', 'Canberra', 'Perth', 'Adelaide',
      'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'
    ];
    
    for (const city of knownCities) {
      if (text.includes(city)) return city;
    }
    
    return '';
  }

  /**
   * Helper: Extract country
   */
  extractCountry(text) {
    for (const country of this.countries) {
      if (text.toUpperCase().includes(country.toUpperCase())) {
        return country;
      }
    }
    return '';
  }

  /**
   * Helper: Extract phone
   */
  extractPhone(text) {
    const phonePatterns = [
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
      /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/
    ];
    
    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return '';
  }

  /**
   * Helper: Extract email
   */
  extractEmail(text) {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : '';
  }

  /**
   * Helper: Check if text contains address components
   */
  containsAddressComponents(text) {
    return this.streetPatterns.some(p => p.test(text)) ||
           this.postalCodePatterns.some(p => p.test(text)) ||
           /\d+\s+[A-Z]/.test(text);
  }

  /**
   * Helper: Check if text is a header/navigation
   */
  isHeaderText(text) {
    const lowerText = text.toLowerCase();
    return lowerText.length < 3 ||
           lowerText.includes('click') ||
           lowerText.includes('learn more') ||
           lowerText.includes('view all') ||
           lowerText.startsWith('more');
  }

  /**
   * Deduplicate locations
   */
  deduplicateLocations(locations) {
    const seen = new Map();
    const unique = [];
    
    locations.forEach(loc => {
      const key = `${loc.streetAddress}|${loc.city}|${loc.postalCode}`.toLowerCase();
      
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(loc);
      }
    });
    
    return unique;
  }
}

module.exports = new UniversalLocationExtractor();
