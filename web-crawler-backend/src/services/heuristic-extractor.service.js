const cheerio = require('cheerio');
const logger = require('../utils/logger');

class HeuristicExtractorService {
  /**
   * Extract addresses using heuristic text analysis
   * @param {string} html - HTML content
   * @param {string} sourceUrl - Source URL
   * @returns {Array} - Array of potential addresses
   */
  extractHeuristicAddresses(html, sourceUrl) {
    const $ = cheerio.load(html);
    const addresses = [];

    // Strategy 1: Look for semantic HTML elements
    addresses.push(...this.extractFromSemanticElements($));

    // Strategy 2: Look near contact/location headings
    addresses.push(...this.extractNearHeadings($));

    // Strategy 3: Scan for address patterns in text
    addresses.push(...this.extractFromTextPatterns($));

    // Strategy 4: Look in structured lists
    addresses.push(...this.extractFromLists($));

    // Deduplicate
    const unique = this.deduplicateAddresses(addresses);
    
    logger.info(`Heuristic extraction found ${unique.length} potential addresses`);
    
    return unique.map(addr => ({
      ...addr,
      source: sourceUrl,
      extractionMethod: 'heuristic'
    }));
  }

  /**
   * Extract from semantic HTML elements (address tags, contact classes)
   */
  extractFromSemanticElements($) {
    const addresses = [];
    const selectors = [
      'address',
      '[class*="address"]',
      '[class*="contact"]',
      '[class*="office"]',
      '[class*="location"]',
      '[id*="address"]',
      '[id*="contact"]',
      '[id*="location"]',
      '.contact-info',
      '.office-location',
      '.location-list',
      '.locations',
      '.office-details',
      '.branch-info'
    ];

    selectors.forEach(sel => {
      $(sel).each((i, el) => {
        const text = $(el).text().trim().replace(/\s{2,}/g, ' ');
        if (text && text.length > 10 && text.length < 500) {
          addresses.push({
            name: '',
            street: text,
            confidence: 0.7
          });
        }
      });
    });

    return addresses;
  }

  /**
   * Extract addresses near relevant headings
   */
  extractNearHeadings($) {
    const addresses = [];
    const headingPatterns = /contact|location|office|offices|find|our locations|addresses|headquarters|visit|reach|where/i;

    $('h1, h2, h3, h4, h5, h6').each((i, h) => {
      const headingText = $(h).text().trim().toLowerCase();
      
      if (headingPatterns.test(headingText)) {
        // Look at next siblings
        let sibling = $(h).next();
        let depth = 0;

        while (sibling.length && depth < 8) {
          const text = sibling.text().trim().replace(/\s{2,}/g, ' ');
          
          if (text && text.length > 15 && text.length < 500) {
            // Check if it looks like an address
            if (this.looksLikeAddress(text)) {
              addresses.push({
                name: headingText,
                street: text,
                confidence: 0.8
              });
            }
          }

          sibling = sibling.next();
          depth++;
        }
      }
    });

    return addresses;
  }

  /**
   * Extract using address pattern matching
   */
  extractFromTextPatterns($) {
    const addresses = [];
    const bodyText = $('body').text();
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

    // Address pattern regex
    const addressPatterns = [
      // Street patterns
      /\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Place|Pl|Square|Sq|Parkway|Pkwy)/i,
      // Suite/Floor patterns
      /\b(Suite|Ste|Floor|Fl|Building|Bldg|Unit|Apt|#)\s*\d+/i,
      // PO Box patterns
      /P\.?O\.?\s*Box\s+\d+/i,
      // International patterns
      /\d{1,5}\s+[\w\s,]+\d{5}(-\d{4})?/  // US zip code pattern
    ];

    for (const line of lines.slice(0, 1000)) { // Limit to first 1000 lines
      if (line.length < 20 || line.length > 300) continue;

      // Check if line matches any address pattern
      const matchesPattern = addressPatterns.some(pattern => pattern.test(line));
      
      if (matchesPattern && this.looksLikeAddress(line)) {
        addresses.push({
          name: '',
          street: line.replace(/\s+/g, ' '),
          confidence: 0.6
        });
      }
    }

    return addresses;
  }

  /**
   * Extract from structured lists (ul, ol, dl)
   */
  extractFromLists($) {
    const addresses = [];

    // Look for lists that might contain locations
    $('ul, ol, dl').each((i, list) => {
      const listText = $(list).text().toLowerCase();
      
      // Check if list context suggests it contains locations
      if (listText.includes('office') || listText.includes('location') || 
          listText.includes('address') || listText.includes('contact')) {
        
        $(list).find('li, dd').each((j, item) => {
          const text = $(item).text().trim().replace(/\s{2,}/g, ' ');
          
          if (text && text.length > 15 && text.length < 400 && this.looksLikeAddress(text)) {
            addresses.push({
              name: '',
              street: text,
              confidence: 0.75
            });
          }
        });
      }
    });

    return addresses;
  }

  /**
   * Check if text looks like an address
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  looksLikeAddress(text) {
    const addressIndicators = [
      // Street suffixes
      /\b(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Place|Pl|Square|Sq|Parkway|Pkwy)\b/i,
      // Suite/Floor indicators
      /\b(Suite|Ste|Floor|Fl|Building|Bldg|Unit|Apt|#)\s*\d+/i,
      // Postal code patterns
      /\b\d{5}(-\d{4})?\b/, // US
      /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/, // Canadian
      /\b[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}\b/, // UK
      // PO Box
      /P\.?O\.?\s*Box\s+\d+/i,
      // Common location words
      /\b(city|town|village|state|province|county|zip|postal|code)\b/i
    ];

    // Must match at least one pattern
    const matchesPattern = addressIndicators.some(pattern => pattern.test(text));
    
    // Must contain a number (street number or postal code)
    const hasNumber = /\d/.test(text);
    
    // Should not be too short or too long
    const reasonableLength = text.length >= 20 && text.length <= 400;

    return matchesPattern && hasNumber && reasonableLength;
  }

  /**
   * Deduplicate addresses based on text similarity
   * @param {Array} addresses - Array of addresses
   * @returns {Array} - Deduplicated addresses
   */
  deduplicateAddresses(addresses) {
    const seen = new Set();
    const unique = [];

    for (const addr of addresses) {
      // Create normalized key
      const key = (addr.street || '').toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .slice(0, 100);

      if (!seen.has(key) && key.length > 10) {
        seen.add(key);
        unique.push(addr);
      }
    }

    return unique;
  }

  /**
   * Extract phone numbers from HTML
   * @param {string} html - HTML content
   * @returns {Array} - Array of phone numbers
   */
  extractPhoneNumbers(html) {
    const $ = cheerio.load(html);
    const phones = new Set();

    // Phone number patterns
    const phonePatterns = [
      // US formats
      /\b1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b/g,
      // International format
      /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
      // Tel: format
      /tel:[\+\d\s\-\(\)]+/gi
    ];

    const bodyText = $('body').text();
    
    phonePatterns.forEach(pattern => {
      const matches = bodyText.match(pattern);
      if (matches) {
        matches.forEach(phone => phones.add(phone.trim()));
      }
    });

    // Also check href="tel:" links
    $('a[href^="tel:"]').each((i, el) => {
      const href = $(el).attr('href');
      const phone = href.replace('tel:', '').trim();
      phones.add(phone);
    });

    return Array.from(phones);
  }

  /**
   * Extract email addresses from HTML
   * @param {string} html - HTML content
   * @returns {Array} - Array of email addresses
   */
  extractEmailAddresses(html) {
    const $ = cheerio.load(html);
    const emails = new Set();

    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    const bodyText = $('body').text();
    const matches = bodyText.match(emailPattern);
    
    if (matches) {
      matches.forEach(email => emails.add(email.toLowerCase()));
    }

    // Also check href="mailto:" links
    $('a[href^="mailto:"]').each((i, el) => {
      const href = $(el).attr('href');
      const email = href.replace('mailto:', '').split('?')[0].trim();
      emails.add(email.toLowerCase());
    });

    return Array.from(emails);
  }
}

module.exports = new HeuristicExtractorService();
