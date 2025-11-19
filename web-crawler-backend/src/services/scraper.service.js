const cheerio = require('cheerio');
const logger = require('../utils/logger');

class ScraperService {
  extractLocations(html, url) {
    const $ = cheerio.load(html);
    const locations = [];

    logger.info(`🔍 Starting extraction from ${url}`);
    logger.info(`📄 HTML length: ${html.length} characters`);

    // Strategy 1: Look for structured data (JSON-LD)
    const jsonLdLocations = this.extractFromJsonLd($, url);
    logger.info(`Strategy 1 (JSON-LD): ${jsonLdLocations.length} locations`);
    locations.push(...jsonLdLocations);

    // Strategy 2: Look for common patterns
    const patternLocations = this.extractFromPatterns($, url);
    logger.info(`Strategy 2 (Patterns): ${patternLocations.length} locations`);
    locations.push(...patternLocations);

    // Strategy 3: Look for address patterns in text
    const addressLocations = this.extractFromAddresses($, url);
    logger.info(`Strategy 3 (Regex): ${addressLocations.length} locations`);
    locations.push(...addressLocations);

    // Strategy 4: Extract metadata and create basic location
    if (locations.length === 0) {
      logger.info('⚠️  No structured locations found, extracting basic info');
      const basicLocation = this.extractBasicInfo($, url);
      if (basicLocation) {
        locations.push(basicLocation);
      }
    }

    logger.info(`✅ Total extracted before dedup: ${locations.length} locations`);
    
    // Log all extracted locations before deduplication
    locations.forEach((loc, idx) => {
      logger.info(`  ${idx + 1}. ${loc.name}: ${loc.address.substring(0, 50)}...`);
    });
    
    // Remove duplicates based on address (less aggressive)
    const uniqueLocations = this.removeDuplicatesImproved(locations);
    logger.info(`📍 ${uniqueLocations.length} unique locations after deduplication`);
    
    return uniqueLocations;
  }

  extractBasicInfo($, sourceUrl) {
    // Extract title, description, and any contact info
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') ||
                  $('h1').first().text().trim() ||
                  new URL(sourceUrl).hostname;

    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';

    // Look for any text that might contain addresses
    const bodyText = $('body').text();
    
    // Try to find email or phone which might indicate a real location
    const emailMatch = bodyText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = bodyText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    // Look for common contact/location keywords
    const locationKeywords = ['address', 'location', 'visit us', 'find us', 'contact', 'office'];
    let potentialAddress = '';

    // Search for sections with location keywords
    locationKeywords.forEach(keyword => {
      $(`*:contains("${keyword}")`).each((i, elem) => {
        if (i > 5) return false; // Limit search
        const text = $(elem).text();
        if (text.length < 500 && text.length > 10) {
          const addressMatch = this.extractAddressFromText(text);
          if (addressMatch) {
            potentialAddress = addressMatch;
            return false;
          }
        }
      });
    });

    return {
      name: title.substring(0, 100),
      address: potentialAddress || `${new URL(sourceUrl).hostname} - See website for address`,
      activity: this.guessActivity(title + ' ' + description),
      usageShare: 'Own'
    };
  }

  guessActivity(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('retail') || lowerText.includes('store')) return 'Retail';
    if (lowerText.includes('warehouse') || lowerText.includes('distribution')) return 'Warehouse';
    if (lowerText.includes('manufacturing') || lowerText.includes('factory')) return 'Manufacturing';
    if (lowerText.includes('office') || lowerText.includes('corporate')) return 'Office';
    if (lowerText.includes('restaurant') || lowerText.includes('food')) return 'Restaurant';
    return 'Office';
  }

  removeDuplicates(locations) {
    const seen = new Set();
    return locations.filter(loc => {
      const key = loc.address.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  removeDuplicatesImproved(locations) {
    const seen = new Map();
    const unique = [];
    
    locations.forEach(loc => {
      // Create a normalized key from the address
      const normalizedAddress = loc.address
        .toLowerCase()
        .replace(/[.,\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Check if we've seen a similar address (allow some variation)
      let isDuplicate = false;
      for (const [key, value] of seen.entries()) {
        // If addresses are very similar (e.g., same street and zip), consider duplicate
        if (this.isSimilarAddress(normalizedAddress, key)) {
          isDuplicate = true;
          // Keep the one with more complete information
          if (loc.address.length > value.address.length) {
            // Replace with better version
            const idx = unique.findIndex(u => u.address === value.address);
            if (idx !== -1) {
              unique[idx] = loc;
              seen.set(normalizedAddress, loc);
            }
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(loc);
        seen.set(normalizedAddress, loc);
      }
    });
    
    return unique;
  }

  isSimilarAddress(addr1, addr2) {
    // Extract numbers (street number, zip code)
    const nums1 = addr1.match(/\d+/g) || [];
    const nums2 = addr2.match(/\d+/g) || [];
    
    // If they share the same street number and zip code, likely the same
    if (nums1.length >= 2 && nums2.length >= 2) {
      const streetNum1 = nums1[0];
      const zip1 = nums1[nums1.length - 1];
      const streetNum2 = nums2[0];
      const zip2 = nums2[nums2.length - 1];
      
      if (streetNum1 === streetNum2 && zip1 === zip2) {
        return true;
      }
    }
    
    // Check if 70% of the address is the same
    const similarity = this.calculateSimilarity(addr1, addr2);
    return similarity > 0.7;
  }

  calculateSimilarity(str1, str2) {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const allWords = new Set([...words1, ...words2]);
    
    let commonCount = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        commonCount++;
      }
    }
    
    return commonCount / allWords.size;
  }

  extractFromJsonLd($, url) {
    const locations = [];
    
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        
        // Handle both single objects and arrays
        const items = Array.isArray(data) ? data : [data];
        
        items.forEach(item => {
          if ((item['@type'] === 'Organization' || item['@type'] === 'LocalBusiness') && item.address) {
            locations.push({
              name: item.name || new URL(url).hostname,
              address: this.formatAddress(item.address),
              activity: item['@type'],
              usageShare: 'Own'
            });
          }
        });
      } catch (error) {
        // Ignore invalid JSON-LD
      }
    });

    if (locations.length > 0) {
      logger.info(`📄 Found ${locations.length} locations in JSON-LD`);
    }
    return locations;
  }

  extractFromPatterns($, url) {
    const locations = [];

    // Look for common location sections - extract ALL matches
    const selectors = [
      '.location', '.office', '.address', '.contact-info', '.contact',
      '[itemprop="address"]', '.headquarters', '.branch', '.store-location',
      '#contact', '#location', '#address', '.office-location', '.location-item',
      '[class*="location"]', '[id*="location"]', '[class*="office"]'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        // Don't limit - extract ALL locations found
        const text = $(elem).text().trim();
        const address = this.extractAddressFromText(text);
        
        if (address && address.length > 15) {
          // Try to find a name/title for this location
          const name = $(elem).find('h1, h2, h3, h4, h5, h6, .title, .name, .location-name, strong, b').first().text().trim() || 
                      $(elem).parent().find('h1, h2, h3, h4, h5, h6').first().text().trim() ||
                      new URL(url).hostname;
          
          // Try to detect activity type from surrounding text
          const activity = this.guessActivity(text);
          
          locations.push({
            name: name.substring(0, 100) || `Location ${i + 1}`,
            address: address,
            activity: activity,
            usageShare: 'Exclusive'
          });
        }
      });
    });

    if (locations.length > 0) {
      logger.info(`🎯 Found ${locations.length} locations via pattern matching`);
    }
    return locations;
  }

  extractFromAddresses($, url) {
    const locations = [];
    // More comprehensive US address regex
    const addressRegex = /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Plaza|Plz|Terrace|Ter)[.,]?\s*(?:Suite|Ste|Unit|#)?\s*[\w\d-]*[.,]?\s*[\w\s]+[.,]?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi;

    const bodyText = $('body').text();
    const matches = bodyText.match(addressRegex);
    
    if (matches && matches.length > 0) {
      // Extract ALL addresses found (up to 50 to prevent spam)
      const uniqueAddresses = [...new Set(matches)]; // Remove duplicates
      uniqueAddresses.slice(0, 50).forEach((address, index) => {
        locations.push({
          name: `Location ${index + 1} - ${new URL(url).hostname}`,
          address: address.trim(),
          activity: 'Office',
          usageShare: 'Exclusive'
        });
      });
      logger.info(`🔍 Found ${uniqueAddresses.length} unique addresses via regex (using first 50)`);
    }

    return locations;
  }

  extractAddressFromText(text) {
    // More flexible address extraction
    const patterns = [
      // Full US address with zip
      /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Plaza|Plz|Terrace|Ter)[.,]?\s*(?:Suite|Ste|Unit|#)?\s*[\w\d-]*[.,]?\s*[\w\s]+[.,]?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/i,
      // Simpler address with city, state
      /\d+[\s\w,.-]+,\s*[\w\s]+,\s*[A-Z]{2}/i,
      // International or generic
      /\d+[\s\w,.-]+\d{5}/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[0].length > 15 && match[0].length < 200) {
        return match[0].trim();
      }
    }
    
    return null;
  }

  formatAddress(addressObj) {
    if (typeof addressObj === 'string') return addressObj;
    
    return `${addressObj.streetAddress || ''}, ${addressObj.addressLocality || ''}, ${addressObj.addressRegion || ''} ${addressObj.postalCode || ''}`.trim();
  }
}

module.exports = new ScraperService();
