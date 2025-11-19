const cheerio = require('cheerio');
const logger = require('../utils/logger');
const contactExtractor = require('./contact-extractor.service');

/**
 * Advanced Location Extractor Service
 * Uses multiple comprehensive strategies to extract ALL locations from a webpage
 */
class LocationExtractorService {
  async extractAllLocations(html, url) {
    const $ = cheerio.load(html);
    const allLocations = [];
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`🔍 COMPREHENSIVE LOCATION EXTRACTION for ${url}`);
    logger.info(`${'='.repeat(80)}\n`);

    // Strategy 1: JSON-LD Structured Data
    const jsonLdLocs = this.extractFromJsonLd($);
    logger.info(`📊 Strategy 1 [JSON-LD]: Found ${jsonLdLocs.length} locations`);
    this.logLocations(jsonLdLocs, 1);
    allLocations.push(...jsonLdLocs);

    // Strategy 2: Schema.org Microdata
    const microdataLocs = this.extractFromMicrodata($);
    logger.info(`📊 Strategy 2 [Microdata]: Found ${microdataLocs.length} locations`);
    this.logLocations(microdataLocs, 2);
    allLocations.push(...microdataLocs);

    // Strategy 3: Location List/Grid Patterns
    const listLocs = this.extractFromLocationLists($);
    logger.info(`📊 Strategy 3 [Location Lists]: Found ${listLocs.length} locations`);
    this.logLocations(listLocs, 3);
    allLocations.push(...listLocs);

    // Strategy 4: Individual Location Sections
    const sectionLocs = this.extractFromSections($);
    logger.info(`📊 Strategy 4 [Sections]: Found ${sectionLocs.length} locations`);
    this.logLocations(sectionLocs, 4);
    allLocations.push(...sectionLocs);

    // Strategy 5: Table-based Locations
    const tableLocs = this.extractFromTables($);
    logger.info(`📊 Strategy 5 [Tables]: Found ${tableLocs.length} locations`);
    this.logLocations(tableLocs, 5);
    allLocations.push(...tableLocs);

    // Strategy 6: Address Pattern Matching
    const addressLocs = this.extractFromAddressPatterns($, url);
    logger.info(`📊 Strategy 6 [Address Regex]: Found ${addressLocs.length} locations`);
    this.logLocations(addressLocs, 6);
    allLocations.push(...addressLocs);

    // Strategy 7: Contact Page Specific
    const contactLocs = this.extractFromContactPage($);
    logger.info(`📊 Strategy 7 [Contact Page]: Found ${contactLocs.length} locations`);
    this.logLocations(contactLocs, 7);
    allLocations.push(...contactLocs);

    // Strategy 8: Data Attributes (Google-style components and SPA data)
    const dataAttrLocs = this.extractFromDataAttributes($, url);
    logger.info(`📊 Strategy 8 [Data Attributes]: Found ${dataAttrLocs.length} locations`);
    this.logLocations(dataAttrLocs, 8);
    allLocations.push(...dataAttrLocs);

    // Strategy 9: Inline JavaScript JSON Data
    const scriptLocs = this.extractFromInlineScripts($, url);
    logger.info(`📊 Strategy 9 [Inline Scripts]: Found ${scriptLocs.length} locations`);
    this.logLocations(scriptLocs, 9);
    allLocations.push(...scriptLocs);

    // Strategy 10: Sequential Headers Pattern (Nutanix-style: h3 country > h3 city > address paragraphs)
    const headerLocs = this.extractFromSequentialHeaders($, url);
    logger.info(`📊 Strategy 10 [Sequential Headers]: Found ${headerLocs.length} locations`);
    this.logLocations(headerLocs, 10);
    allLocations.push(...headerLocs);

    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📦 TOTAL EXTRACTED: ${allLocations.length} locations (before deduplication)`);
    logger.info(`${'='.repeat(80)}\n`);

    // Deduplicate intelligently
    const uniqueLocations = this.deduplicateLocations(allLocations);
    
    logger.info(`✅ FINAL RESULT: ${uniqueLocations.length} unique locations\n`);
    
    return uniqueLocations;
  }

  extractFromJsonLd($) {
    const locations = [];
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        const items = Array.isArray(data) ? data : [data];
        
        items.forEach(item => {
          if (item['@type'] === 'Organization' || item['@type'] === 'LocalBusiness' || 
              item['@type'] === 'Place' || item['@type'] === 'PostalAddress') {
            
            const address = item.address || item.location?.address;
            if (address) {
              const fullAddress = typeof address === 'string' ? address :
                `${address.streetAddress || ''}, ${address.addressLocality || ''}, ${address.addressRegion || ''} ${address.postalCode || ''}`.trim();
              
              if (fullAddress.length > 10) {
                locations.push({
                  name: item.name || item.location?.name || 'Office',
                  address: fullAddress,
                  activity: this.guessActivity(item.name || ''),
                  usageShare: 'Exclusive',
                  phone: item.telephone || '',
                  email: item.email || ''
                });
              }
            }
          }
        });
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    return locations;
  }

  extractFromMicrodata($) {
    const locations = [];
    $('[itemtype*="PostalAddress"], [itemtype*="Organization"], [itemtype*="LocalBusiness"]').each((i, elem) => {
      const $elem = $(elem);
      const streetAddress = $elem.find('[itemprop="streetAddress"]').text().trim();
      const addressLocality = $elem.find('[itemprop="addressLocality"]').text().trim();
      const addressRegion = $elem.find('[itemprop="addressRegion"]').text().trim();
      const postalCode = $elem.find('[itemprop="postalCode"]').text().trim();
      
      if (streetAddress || addressLocality) {
        const fullAddress = `${streetAddress}, ${addressLocality}, ${addressRegion} ${postalCode}`.trim();
        const name = $elem.find('[itemprop="name"]').first().text().trim() || 
                    $elem.closest('[itemtype*="Organization"]').find('[itemprop="name"]').first().text().trim() ||
                    'Office';
        
        locations.push({
          name: name,
          address: fullAddress,
          activity: this.guessActivity(name),
          usageShare: 'Exclusive',
          phone: $elem.find('[itemprop="telephone"]').text().trim(),
          email: $elem.find('[itemprop="email"]').text().trim()
        });
      }
    });
    return locations;
  }

  extractFromLocationLists($) {
    const locations = [];
    
    // Look for lists/grids of locations
    const containerSelectors = [
      '.locations-list', '.location-list', '.office-list', '.offices-list',
      '.locations-grid', '.location-grid', '.offices-grid',
      '.grid-contacts', // Wissen-style grid
      '.addresses-section', '.addresses-col', '.addresses-box', '.addresses-2', // Dutch/European styles
      '[class*="location-list"]', '[class*="office-list"]',
      '[class*="contact"]', // Contact grids
      '[class*="address"]', // Address containers
      '[id*="locations"]', '[id*="offices"]', '[id*="map"]', '[id*="address"]',
      '.wp-block-group', // WordPress blocks
      '.elementor-widget-container' // Elementor
    ];

    containerSelectors.forEach(selector => {
      $(selector).each((i, container) => {
        const $container = $(container);
        
        // Look for individual location items within container
        const itemSelectors = [
          '.location-item', '.office-item', '.location', '.office',
          '.contact-in-grid', // Wissen-style items
          '.address-item', '.address-box', '.address-text', '.address-map', // Dutch/European address items
          '[class*="location-"]', '[class*="office-"]', '[class*="contact-"]', '[class*="address-"]',
          'li', 'article', '.card', '.box', 'address'
        ];
        
        itemSelectors.forEach(itemSel => {
          $container.find(itemSel).each((j, item) => {
            const $item = $(item);
            const text = $item.text();
            
            // Skip if too short
            if (text.length < 20) return;
            
            // Extract address - try multiple methods
            let address = this.findAddressInText(text);
            
            // If no regex match, try finding address elements
            if (!address) {
              address = $item.find('.address, .location-address, [class*="address"], p').text().trim();
            }
            
            // If still no address, use the paragraph text after the heading
            if (!address && text.length > 20) {
              const paragraphs = $item.find('p').toArray();
              if (paragraphs.length > 0) {
                // Usually address is in last <p> or after the h5
                address = $(paragraphs[paragraphs.length - 1]).text().trim();
              }
            }
            
            if (address && address.length > 15) {
              // Extract location name from heading
              const name = $item.find('h1, h2, h3, h4, h5, h6, strong, b').first().text().trim() ||
                          $item.find('[class*="title"], [class*="name"]').first().text().trim() ||
                          address.split(',')[0] || // First part of address
                          `Location ${locations.length + 1}`;
              
              locations.push({
                name: name.substring(0, 100),
                address: address,
                activity: this.guessActivity(text + ' ' + name),
                usageShare: 'Exclusive',
                phone: this.extractPhone($item),
                email: this.extractEmail($item)
              });
            }
          });
        });
      });
    });
    
    return locations;
  }

  extractFromSections($) {
    const locations = [];
    
    // Look for individual sections that might represent locations
    const selectors = [
      'section.location', 'section.office', 'section[id*="location"]', 'section[id*="office"]',
      'div.location', 'div.office', 'div[class*="location-"]', 'div[class*="office-"]',
      '.contact-info', '.contact-section', '[id*="contact"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text();
        
        // Skip if too small (likely not a real location)
        if (text.length < 50) return;
        
        const address = this.findAddressInText(text) ||
                       $elem.find('.address, [class*="address"], [itemprop="address"]').text().trim();
        
        if (address && address.length > 15) {
          // Try to find a heading for this location
          const name = $elem.find('h1, h2, h3, h4, h5, h6').first().text().trim() ||
                      $elem.prev('h1, h2, h3, h4, h5, h6').text().trim() ||
                      $elem.find('strong, b, .title, .name').first().text().trim() ||
                      `Location ${i + 1}`;
          
          locations.push({
            name: name.substring(0, 100),
            address: address,
            activity: this.guessActivity(text),
            usageShare: 'Exclusive',
            phone: this.extractPhone($elem),
            email: this.extractEmail($elem)
          });
        }
      });
    });
    
    return locations;
  }

  extractFromTables($) {
    const locations = [];
    
    $('table').each((i, table) => {
      const $table = $(table);
      const text = $table.text().toLowerCase();
      
      // Check if this table contains location/address information
      if (text.includes('address') || text.includes('location') || text.includes('office')) {
        $table.find('tr').each((j, row) => {
          const $row = $(row);
          const rowText = $row.text();
          
          const address = this.findAddressInText(rowText);
          if (address && address.length > 15) {
            const name = $row.find('td:first-child, th:first-child').text().trim() || `Location ${j + 1}`;
            
            locations.push({
              name: name.substring(0, 100),
              address: address,
              activity: this.guessActivity(rowText),
              usageShare: 'Exclusive',
              phone: this.extractPhone($row),
              email: this.extractEmail($row)
            });
          }
        });
      }
    });
    
    return locations;
  }

  extractFromAddressPatterns($, url) {
    const locations = [];
    const bodyText = $('body').text();
    
    // Comprehensive address patterns for different countries
    const patterns = [
      // US addresses
      /\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Plaza|Plz|Terrace|Ter|Highway|Hwy)[.,]?\s*(?:Suite|Ste|Unit|Apt|#)?\s*[\w\d-]*[.,]?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*[.,]?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi,
      
      // UK addresses (simplified)
      /\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*[.,]?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*[.,]?\s*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}/gi,
      
      // Netherlands/European addresses (postcode + city)
      /\d{4}\s*[A-Z]{2}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi,
      
      // Netherlands full address (street + postcode)
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+\d+[a-z]?\s*,?\s*\d{4}\s*[A-Z]{2}\s+[A-Z][a-z]+/gi,
      
      // More flexible pattern
      /\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s+\d{5}/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = bodyText.match(pattern);
      if (matches) {
        matches.forEach((address, idx) => {
          locations.push({
            name: `${new URL(url).hostname} - Location ${idx + 1}`,
            address: address.trim(),
            activity: 'Office',
            usageShare: 'Exclusive',
            phone: '',
            email: ''
          });
        });
      }
    });
    
    return locations;
  }

  extractFromDataAttributes($, url) {
    const locations = [];
    
    // Strategy 8a: Elements with data-slug or data-location attributes (Google careers style)
    $('[data-slug], [data-location], [data-city], [data-office]').each((i, elem) => {
      const $elem = $(elem);
      
      // Get location name from various sources
      const slug = $elem.attr('data-slug');
      const locationAttr = $elem.attr('data-location');
      const cityAttr = $elem.attr('data-city');
      const officeAttr = $elem.attr('data-office');
      
      // Try to find the display name in child elements
      const displayName = $elem.find('[jsname="K4r5Ff"]').text().trim() || // Google specific
                         $elem.find('.location-name, .city-name, .office-name').text().trim() ||
                         $elem.text().trim();
      
      const locationName = displayName || 
                          locationAttr || 
                          cityAttr || 
                          officeAttr || 
                          (slug && slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      
      if (locationName && locationName.length > 2 && locationName.length < 100) {
        locations.push({
          name: locationName,
          address: locationName, // City names will be geocoded
          activity: 'Office',
          usageShare: 'Exclusive',
          phone: '',
          email: ''
        });
      }
    });
    
    // Strategy 8b: React/Vue data attributes (__INITIAL_STATE__, data-vue, data-react)
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      
      // Look for location data in inline scripts
      if (scriptContent && (scriptContent.includes('location') || scriptContent.includes('office') || scriptContent.includes('address'))) {
        try {
          // Try to find JSON arrays with location data
          const jsonMatch = scriptContent.match(/\[\s*\[["'][^"']+["'],\s*["'][^"']+["']/g);
          if (jsonMatch) {
            jsonMatch.forEach(match => {
              // Extract city names from arrays like ["City","slug",[lat,lng],["Full Address"],"Region",count]
              const cityMatch = match.match(/["']([A-Z][a-zA-Z\s&\/\-().]+)["']/g);
              if (cityMatch && cityMatch.length > 0) {
                const cityName = cityMatch[0].replace(/['"]/g, '');
                if (cityName.length > 2 && cityName.length < 100 && !cityName.includes('<') && !cityName.includes('http')) {
                  locations.push({
                    name: cityName,
                    address: cityName,
                    activity: 'Office',
                    usageShare: 'Exclusive',
                    phone: '',
                    email: ''
                  });
                }
              }
            });
          }
        } catch (e) {
          // Skip malformed content
        }
      }
    });
    
    return locations;
  }

  extractFromContactPage($) {
    const locations = [];
    
    // Look for contact page specific patterns
    $('.contact-location, .contact-address, #contact-info, .branch-info').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      
      const address = this.findAddressInText(text);
      if (address && address.length > 15) {
        const name = $elem.find('h1, h2, h3, h4, h5, h6, strong, b').first().text().trim() || 
                    $elem.attr('data-location') || 
                    `Contact Location ${i + 1}`;
        
        locations.push({
          name: name.substring(0, 100),
          address: address,
          activity: this.guessActivity(text),
          usageShare: 'Exclusive',
          phone: this.extractPhone($elem),
          email: this.extractEmail($elem)
        });
      }
    });
    
    return locations;
  }

  findAddressInText(text) {
    // Try multiple address patterns
    
    // US address with street type
    const usPattern = /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Plaza|Plz|Terrace|Ter)[.,]?\s*(?:Suite|Ste|Unit|#)?\s*[\w\d-]*[.,]?\s*[\w\s]+[.,]?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/i;
    let match = text.match(usPattern);
    if (match) return match[0].trim();
    
    // International address (city, country/state, postal code)
    const intlPattern = /[\w\s]+,\s*[\w\s]+,\s*[\w\s]+\s+\d{3,6}/i;
    match = text.match(intlPattern);
    if (match) return match[0].trim();
    
    // If text contains comma-separated parts and looks like an address
    if (text.includes(',') && text.length > 20 && text.length < 300) {
      // Remove any HTML-like content
      const cleaned = text.replace(/<[^>]*>/g, '').trim();
      // If it has at least 2 commas and reasonable length, it's likely an address
      if ((cleaned.match(/,/g) || []).length >= 1) {
        return cleaned;
      }
    }
    
    return null;
  }

  extractPhone($elem) {
    const phonePattern = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const text = $elem.text();
    const match = text.match(phonePattern);
    return match ? match[0].trim() : '';
  }

  extractEmail($elem) {
    const emailPattern = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const text = $elem.text();
    const match = text.match(emailPattern);
    return match ? match[0].trim() : '';
  }

  guessActivity(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('headquarter') || lowerText.includes('hq')) return 'Headquarters';
    if (lowerText.includes('retail') || lowerText.includes('store') || lowerText.includes('shop')) return 'Retail';
    if (lowerText.includes('warehouse') || lowerText.includes('distribution') || lowerText.includes('fulfillment')) return 'Warehouse';
    if (lowerText.includes('manufacturing') || lowerText.includes('factory') || lowerText.includes('plant')) return 'Manufacturing';
    if (lowerText.includes('data center') || lowerText.includes('datacenter')) return 'Data Center';
    if (lowerText.includes('restaurant') || lowerText.includes('cafe') || lowerText.includes('food')) return 'Restaurant';
    if (lowerText.includes('branch') || lowerText.includes('regional')) return 'Branch Office';
    
    return 'Office';
  }

  deduplicateLocations(locations) {
    const uniqueMap = new Map();
    
    locations.forEach(loc => {
      // Create a normalized key
      const normalizedAddress = this.normalizeAddress(loc.address);
      
      if (!uniqueMap.has(normalizedAddress)) {
        uniqueMap.set(normalizedAddress, loc);
      } else {
        // Keep the one with more information
        const existing = uniqueMap.get(normalizedAddress);
        if (this.getInfoScore(loc) > this.getInfoScore(existing)) {
          uniqueMap.set(normalizedAddress, loc);
        }
      }
    });
    
    const unique = Array.from(uniqueMap.values());
    
    logger.info(`🧹 Deduplication: ${locations.length} → ${unique.length} locations`);
    
    return unique;
  }

  normalizeAddress(address) {
    return address
      .toLowerCase()
      .replace(/[.,\-#]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|suite|ste|unit|apt)\b/g, '')
      .trim();
  }

  getInfoScore(location) {
    let score = 0;
    if (location.name && location.name.length > 5) score += 2;
    if (location.address && location.address.length > 20) score += 3;
    if (location.phone) score += 1;
    if (location.email) score += 1;
    if (location.activity && location.activity !== 'Office') score += 1;
    return score;
  }

  logLocations(locations, strategyNum) {
    if (locations.length > 0) {
      locations.forEach((loc, idx) => {
        logger.info(`  [${strategyNum}.${idx + 1}] ${loc.name}: ${loc.address.substring(0, 60)}...`);
      });
    }
  }

  /**
   * Extract locations from inline JavaScript/JSON data
   * Many SPAs embed location data in script tags as window.INITIAL_DATA or similar
   */
  extractFromInlineScripts($, url) {
    const locations = [];
    
    $('script:not([src])').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (!scriptContent || scriptContent.length < 50) return;
      
      try {
        // Look for patterns like: window.DATA = {...}, var offices = [...], const locations = [...]
        const patterns = [
          /(?:window\.|var |const |let )\w*(?:office|location|site|branch|address|contact)\w*\s*=\s*(\[[\s\S]*?\]);/gi,
          /(?:window\.|var |const |let )\w*data\w*\s*=\s*({[\s\S]*?});/gi,
          /"(?:offices|locations|sites|branches|addresses)"\s*:\s*(\[[^\]]*\])/gi
        ];
        
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(scriptContent)) !== null) {
            try {
              const jsonStr = match[1];
              const data = JSON.parse(jsonStr);
              
              // Parse the extracted JSON for locations
              const parsedLocs = this.parseJsonForLocations(data, url);
              locations.push(...parsedLocs);
            } catch (e) {
              // Not valid JSON or parsing failed
            }
          }
        });
      } catch (e) {
        // Script parsing error
      }
    });
    
    return locations;
  }

  /**
   * Parse JSON data recursively for location information
   */
  parseJsonForLocations(data, url) {
    const locations = [];
    
    const scan = (obj, depth = 0) => {
      if (depth > 15 || !obj || typeof obj !== 'object') return;
      
      // Check if this object looks like a location
      const hasAddress = obj.address || obj.street || obj.city || obj.country ||
                        obj.Address || obj.City || obj.State || obj.Country;
      const hasCoords = (obj.lat && obj.lon) || (obj.latitude && obj.longitude) ||
                       (obj.Latitude && obj.Longitude);
      const hasOfficeFields = obj.office || obj.location || obj.site || obj.branch ||
                             obj.officeName || obj.locationName || obj.siteName;
      
      if (hasAddress || hasCoords || hasOfficeFields) {
        const street = obj.address || obj.street || obj.streetAddress || obj.Address || '';
        const city = obj.city || obj.City || obj.locality || '';
        const state = obj.state || obj.State || obj.region || obj.province || '';
        const country = obj.country || obj.Country || obj.countryCode || '';
        const postalCode = obj.postalCode || obj.zip || obj.zipcode || '';
        
        const fullAddress = `${street}, ${city}, ${state} ${postalCode}, ${country}`.replace(/,\s*,/g, ',').trim();
        
        if (fullAddress.length > 10) {
          locations.push({
            name: obj.name || obj.title || obj.officeName || obj.locationName || obj.siteName || 'Office',
            address: fullAddress,
            activity: this.guessActivity(obj.name || obj.type || ''),
            usageShare: 'Exclusive',
            phone: obj.phone || obj.telephone || obj.phoneNumber || '',
            email: obj.email || '',
            extractionMethod: 'inline-script'
          });
        }
      }
      
      // Recursively scan
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach(item => scan(item, depth + 1));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          scan(obj[key], depth + 1);
        }
      }
    };
    
    scan(data);
    return locations;
  }

  /**
   * Extract locations from sequential header pattern
   * SIMPLE APPROACH: Every h3 is either a country or city, extract text until next h3
   */
  extractFromSequentialHeaders($, url) {
    const locations = [];
    let currentCountry = '';
    
    $('h3').each((i, elem) => {
      const $h3 = $(elem);
      const headerText = $h3.text().trim();
      
      if (!headerText) return;
      
      // If ALL CAPS or has parentheses = Country
      if (headerText === headerText.toUpperCase() || headerText.includes('(')) {
        currentCountry = headerText;
        return;
      }
      
      // Otherwise it's a city - extract everything until next h3
      if (currentCountry) {
        const cityName = headerText;
        
        // Get all text between this h3 and next h3
        const textBlocks = [];
        $h3.nextUntil('h3').each((j, el) => {
          const text = $(el).text().trim();
          if (text) textBlocks.push(text);
        });
        
        const fullText = textBlocks.join(' ').replace(/\s+/g, ' ');
        
        if (fullText.length > 20) {
          locations.push({
            name: `${cityName}, ${currentCountry}`,
            address: fullText.substring(0, 500),
            activity: 'Office',
            usageShare: 'Exclusive',
            extractionMethod: 'sequential-headers'
          });
        }
      }
    });
    
    return locations;
  }
}

module.exports = new LocationExtractorService();
