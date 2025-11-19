const logger = require('../utils/logger');

/**
 * Advanced Extraction Service
 * Deep extraction with regex, structured data, and context tracking
 */
class AdvancedExtractorService {
  constructor() {
    // Enhanced regex patterns
    this.patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      
      // Phone patterns for multiple countries
      phone: {
        india: /(?:\+91|0)?[\s-]?\d{5}[\s-]?\d{5}|\d{3}[\s-]\d{3}[\s-]\d{4}/g,
        us: /(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        uk: /(?:\+44|0)\s?\d{4}\s?\d{6}|\+44\s?\d{3}\s?\d{3}\s?\d{4}/g,
        international: /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g
      },
      
      // PIN/Postal codes
      pin: {
        india: /\b\d{6}\b/g,
        us: /\b\d{5}(?:-\d{4})?\b/g,
        uk: /\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/gi,
        canada: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi
      },
      
      // Address components
      address: {
        street: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\b/gi,
        suite: /(?:suite|ste|unit|#)\s*[\w-]+/gi,
        floor: /(?:floor|fl)\s*\d+/gi,
        building: /(?:building|bldg)\s*[\w-]+/gi
      }
    };

    // Location keywords for context
    this.locationLabels = [
      'address', 'head office', 'branch', 'office', 'showroom', 'store', 
      'location', 'pincode', 'postal code', 'zip code', 'city', 'state',
      'country', 'headquarters', 'hq', 'contact', 'reach us', 'visit us',
      'find us', 'corporate office', 'regional office', 'odc', 'delivery center'
    ];
  }

  /**
   * Full extraction from page with provenance tracking
   */
  async fullExtraction(page, url) {
    logger.info('🔍 Starting deep extraction with provenance tracking...');

    const extractionData = await page.evaluate(() => {
      const data = {
        // Text content
        bodyText: document.body.innerText || '',
        htmlContent: document.body.innerHTML || '',
        
        // Structured data
        jsonLd: [],
        microdata: [],
        metaTags: [],
        
        // Script contents
        scripts: [],
        
        // Attributes
        dataAttributes: [],
        
        // Semantic elements
        addresses: [],
        
        // Links (for discovering location pages)
        locationLinks: [],
        
        // Provenance data
        provenance: []
      };

      // Extract JSON-LD
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script, idx) => {
        try {
          const json = JSON.parse(script.textContent);
          data.jsonLd.push({
            index: idx,
            data: json,
            snippet: script.textContent.substring(0, 200)
          });
        } catch (e) {}
      });

      // Helper to get CSS selector
      const getSelector = function(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
      };

      // Extract microdata
      document.querySelectorAll('[itemtype]').forEach((elem, idx) => {
        const item = {
          type: elem.getAttribute('itemtype'),
          properties: {},
          text: elem.textContent.trim().substring(0, 500),
          selector: getSelector(elem)
        };

        elem.querySelectorAll('[itemprop]').forEach(prop => {
          const propName = prop.getAttribute('itemprop');
          item.properties[propName] = prop.textContent.trim() || prop.getAttribute('content');
        });

        data.microdata.push(item);
      });

      // Extract meta tags
      document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
          data.metaTags.push({ name, content });
        }
      });

      // Extract script contents (for data in scripts)
      document.querySelectorAll('script').forEach((script, idx) => {
        const content = script.textContent || '';
        if (content.length > 0 && content.length < 50000) { // Avoid huge scripts
          data.scripts.push({
            index: idx,
            content: content,
            src: script.src || ''
          });
        }
      });

      // Extract data attributes
      document.querySelectorAll('[data-address], [data-location], [data-office], [data-city], [data-state], [data-country], [data-postal], [data-phone], [data-email]').forEach(elem => {
        const attrs = {};
        for (const attr of elem.attributes) {
          if (attr.name.startsWith('data-')) {
            attrs[attr.name] = attr.value;
          }
        }
        
        data.dataAttributes.push({
          selector: getSelector(elem),
          attributes: attrs,
          text: elem.textContent.trim().substring(0, 200)
        });
      });

      // Extract <address> tags
      document.querySelectorAll('address').forEach((addr, idx) => {
        data.addresses.push({
          index: idx,
          html: addr.innerHTML,
          text: addr.textContent.trim(),
          selector: getSelector(addr)
        });
      });

      // Extract location-related links
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        const text = link.textContent.trim().toLowerCase();
        
        // Check if link might lead to location pages
        const locationKeywords = ['location', 'office', 'contact', 'address', 'branch', 'store', 'showroom', 'find-us', 'reach-us'];
        const isLocationLink = locationKeywords.some(keyword => 
          href.toLowerCase().includes(keyword) || text.includes(keyword)
        );

        if (isLocationLink && href.startsWith('http')) {
          data.locationLinks.push({
            href: href,
            text: text,
            selector: getSelector(link)
          });
        }
      });

      return data;
    });

    // Process extracted data
    const results = {
      emails: this.extractEmails(extractionData),
      phones: this.extractPhones(extractionData),
      addresses: this.extractAddresses(extractionData),
      structuredData: this.parseStructuredData(extractionData),
      locationLinks: extractionData.locationLinks,
      provenance: []
    };

    logger.info(`   ✓ Extracted: ${results.emails.length} emails, ${results.phones.length} phones, ${results.addresses.length} addresses`);
    logger.info(`   ✓ Found: ${extractionData.jsonLd.length} JSON-LD, ${extractionData.microdata.length} microdata items`);
    logger.info(`   ✓ Discovered: ${results.locationLinks.length} location-related links`);

    return results;
  }

  /**
   * Extract emails with context
   */
  extractEmails(data) {
    const emails = new Set();
    const sources = [
      { text: data.bodyText, source: 'body-text' },
      { text: data.htmlContent, source: 'html-content' },
      ...data.scripts.map(s => ({ text: s.content, source: `script-${s.index}` })),
      ...data.dataAttributes.map(d => ({ text: JSON.stringify(d.attributes), source: d.selector }))
    ];

    sources.forEach(({ text, source }) => {
      const matches = text.match(this.patterns.email);
      if (matches) {
        matches.forEach(email => {
          // Validate email
          if (this.isValidEmail(email)) {
            emails.add(email.toLowerCase());
          }
        });
      }
    });

    return Array.from(emails);
  }

  /**
   * Extract phones with normalization
   */
  extractPhones(data) {
    const phones = new Set();
    const sources = [
      data.bodyText,
      data.htmlContent,
      ...data.scripts.map(s => s.content),
      ...data.dataAttributes.map(d => JSON.stringify(d.attributes))
    ];

    const concatenated = sources.join(' ');

    // Try all phone patterns
    Object.values(this.patterns.phone).forEach(pattern => {
      const matches = concatenated.match(pattern);
      if (matches) {
        matches.forEach(phone => {
          const cleaned = this.normalizePhone(phone);
          if (cleaned) phones.add(cleaned);
        });
      }
    });

    return Array.from(phones);
  }

  /**
   * Extract addresses with PIN codes
   */
  extractAddresses(data) {
    const addresses = [];

    // From <address> tags
    data.addresses.forEach(addr => {
      addresses.push({
        text: addr.text,
        source: 'address-tag',
        selector: addr.selector,
        pins: this.extractPINs(addr.text)
      });
    });

    // From structured data
    data.jsonLd.forEach(json => {
      const extracted = this.extractAddressFromJsonLd(json.data);
      if (extracted) {
        addresses.push({
          ...extracted,
          source: 'json-ld',
          pins: this.extractPINs(extracted.text || '')
        });
      }
    });

    // From microdata
    data.microdata.forEach(item => {
      if (item.type && item.type.includes('PostalAddress')) {
        addresses.push({
          text: item.text,
          properties: item.properties,
          source: 'microdata',
          selector: item.selector,
          pins: this.extractPINs(item.text)
        });
      }
    });

    // From text blobs with location labels
    const textAddresses = this.extractAddressesFromText(data.bodyText);
    addresses.push(...textAddresses);

    return addresses;
  }

  /**
   * Extract addresses from JSON-LD
   */
  extractAddressFromJsonLd(json) {
    const items = Array.isArray(json) ? json : [json];
    
    for (const item of items) {
      if (item.address) {
        if (typeof item.address === 'string') {
          return { text: item.address };
        } else if (typeof item.address === 'object') {
          return {
            streetAddress: item.address.streetAddress || '',
            addressLocality: item.address.addressLocality || '',
            addressRegion: item.address.addressRegion || '',
            postalCode: item.address.postalCode || '',
            addressCountry: item.address.addressCountry || '',
            text: this.formatAddress(item.address)
          };
        }
      }
    }
    return null;
  }

  /**
   * Format structured address
   */
  formatAddress(addr) {
    const parts = [
      addr.streetAddress,
      addr.addressLocality,
      addr.addressRegion,
      addr.postalCode,
      addr.addressCountry
    ].filter(p => p);
    
    return parts.join(', ');
  }

  /**
   * Extract addresses from text blobs
   */
  extractAddressesFromText(text) {
    const addresses = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].toLowerCase();
      
      // Check if line has location label
      const hasLabel = this.locationLabels.some(label => line.includes(label));
      
      if (hasLabel) {
        // Get next 2-4 lines as potential address
        const addressLines = lines.slice(i + 1, i + 5);
        const addressText = addressLines.join(', ');
        
        // Validate it looks like an address
        if (this.looksLikeAddress(addressText)) {
          addresses.push({
            text: addressText,
            source: 'text-blob',
            label: lines[i],
            pins: this.extractPINs(addressText)
          });
        }
      }
    }

    return addresses;
  }

  /**
   * Check if text looks like an address
   */
  looksLikeAddress(text) {
    const hasStreet = this.patterns.address.street.test(text);
    const hasPin = Object.values(this.patterns.pin).some(pattern => pattern.test(text));
    const hasCity = text.split(',').length >= 2; // At least 2 components
    
    return (hasStreet || hasPin) && hasCity && text.length >= 20;
  }

  /**
   * Extract PIN codes
   */
  extractPINs(text) {
    const pins = [];
    
    Object.entries(this.patterns.pin).forEach(([country, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(pin => {
          pins.push({ code: pin, country: country });
        });
      }
    });

    return pins;
  }

  /**
   * Parse structured data for locations
   */
  parseStructuredData(data) {
    const locations = [];

    // Parse JSON-LD
    data.jsonLd.forEach(({ data: json }) => {
      const items = Array.isArray(json) ? json : [json];
      
      items.forEach(item => {
        if (item['@type'] === 'Organization' || 
            item['@type'] === 'LocalBusiness' ||
            item['@type'] === 'Place') {
          
          const location = {
            name: item.name || '',
            address: this.extractAddressFromJsonLd(item),
            phone: item.telephone || '',
            email: item.email || '',
            type: item['@type'],
            source: 'json-ld'
          };

          if (location.name || location.address) {
            locations.push(location);
          }
        }
      });
    });

    return locations;
  }

  /**
   * Validate email
   */
  isValidEmail(email) {
    // Filter out common false positives
    const invalidDomains = ['.png', '.jpg', '.gif', '.css', '.js', '.woff'];
    return !invalidDomains.some(ext => email.toLowerCase().endsWith(ext));
  }

  /**
   * Normalize phone number
   */
  normalizePhone(phone) {
    // Remove common separators
    let cleaned = phone.replace(/[-.\s()]/g, '');
    
    // Remove country code prefix if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // Must have at least 10 digits
    if (cleaned.length >= 10) {
      return '+' + cleaned;
    }
    
    return null;
  }
}

module.exports = new AdvancedExtractorService();
