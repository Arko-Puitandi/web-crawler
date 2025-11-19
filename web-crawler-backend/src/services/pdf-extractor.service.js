const pdfParse = require('pdf-parse');
const axios = require('axios');
const logger = require('../utils/logger');

class PdfExtractorService {
  /**
   * Extract text from PDF URL
   */
  async extractTextFromPdf(url) {
    try {
      logger.info(`📄 Downloading PDF from: ${url}`);
      
      // Download PDF as buffer
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const pdfBuffer = Buffer.from(response.data);
      logger.info(`📄 PDF downloaded, size: ${pdfBuffer.length} bytes`);

      // Parse PDF
      const data = await pdfParse(pdfBuffer);
      logger.info(`📄 PDF parsed successfully. Pages: ${data.numpages}, Text length: ${data.text.length}`);

      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      };
    } catch (error) {
      logger.error(`Error extracting text from PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract locations from PDF text using pattern matching
   */
  extractLocationsFromText(text, sourceUrl) {
    const locations = [];
    
    logger.info(`🔍 Extracting locations from PDF text...`);

    // Split text into lines for better parsing
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Strategy 1: Look for structured address blocks
    locations.push(...this.extractStructuredAddresses(lines, sourceUrl));

    // Strategy 2: Pattern matching for addresses
    locations.push(...this.extractAddressPatterns(text, sourceUrl));

    // Strategy 3: Look for office/location sections
    locations.push(...this.extractLocationSections(lines, sourceUrl));

    logger.info(`📄 Extracted ${locations.length} locations from PDF text`);
    
    return locations;
  }

  /**
   * Extract structured addresses (multi-line address blocks)
   */
  extractStructuredAddresses(lines, sourceUrl) {
    const locations = [];
    const addressKeywords = [
      'office', 'headquarters', 'location', 'address', 'branch',
      'oficina', 'sede', 'dirección', 'sucursal', // Spanish
      'bureau', 'adres', 'vestiging', 'kantoor', // Dutch
      'büro', 'adresse', 'niederlassung', // German
      'bureau', 'adresse', 'siège' // French
    ];

    for (let i = 0; i < lines.length - 3; i++) {
      const line = lines[i].toLowerCase();
      
      // Check if line contains location keywords
      const hasKeyword = addressKeywords.some(keyword => line.includes(keyword));
      
      if (hasKeyword) {
        // Look at next 5 lines for address components
        const addressBlock = lines.slice(i, i + 6).join('\n');
        
        // Check if we have typical address components
        if (this.hasAddressComponents(addressBlock)) {
          locations.push({
            locationName: lines[i],
            locationAddress: lines.slice(i + 1, i + 5).join(', '),
            sourceUrl,
            sourceType: 'pdf'
          });
        }
      }
    }

    return locations;
  }

  /**
   * Extract addresses using regex patterns
   */
  extractAddressPatterns(text, sourceUrl) {
    const locations = [];

    // US addresses: City, State ZIP
    const usPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/g;
    let match;
    
    while ((match = usPattern.exec(text)) !== null) {
      const addressContext = this.getAddressContext(text, match.index, 200);
      locations.push({
        locationName: this.extractLocationName(addressContext) || match[1],
        locationAddress: match[0],
        city: match[1],
        state: match[2],
        postcode: match[3],
        countryIso3: 'USA',
        sourceUrl,
        sourceType: 'pdf'
      });
    }

    // UK postcodes
    const ukPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/g;
    while ((match = ukPattern.exec(text)) !== null) {
      const addressContext = this.getAddressContext(text, match.index, 200);
      locations.push({
        locationName: this.extractLocationName(addressContext) || match[1],
        locationAddress: match[0],
        postcode: match[2],
        countryIso3: 'GBR',
        sourceUrl,
        sourceType: 'pdf'
      });
    }

    // Netherlands postcodes (1234 AB format)
    const nlPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*(\d{4}\s*[A-Z]{2})/g;
    while ((match = nlPattern.exec(text)) !== null) {
      const addressContext = this.getAddressContext(text, match.index, 200);
      locations.push({
        locationName: this.extractLocationName(addressContext) || match[1],
        locationAddress: match[0],
        postcode: match[2],
        countryIso3: 'NLD',
        sourceUrl,
        sourceType: 'pdf'
      });
    }

    // Generic street addresses with numbers
    const streetPattern = /\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct))?/gi;
    while ((match = streetPattern.exec(text)) !== null) {
      const addressContext = this.getAddressContext(text, match.index, 300);
      if (this.hasAddressComponents(addressContext)) {
        locations.push({
          locationName: this.extractLocationName(addressContext),
          locationAddress: addressContext.substring(0, 200),
          sourceUrl,
          sourceType: 'pdf'
        });
      }
    }

    return locations;
  }

  /**
   * Extract location sections (offices, branches, etc.)
   */
  extractLocationSections(lines, sourceUrl) {
    const locations = [];
    const sectionHeaders = [
      /our\s+offices?/i,
      /our\s+locations?/i,
      /branch\s+offices?/i,
      /contact\s+information/i,
      /global\s+presence/i,
      /office\s+locations?/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a section header
      const isHeader = sectionHeaders.some(pattern => pattern.test(line));
      
      if (isHeader) {
        // Extract next 20 lines as potential locations
        const sectionLines = lines.slice(i + 1, i + 21);
        
        for (let j = 0; j < sectionLines.length - 2; j += 3) {
          const potentialAddress = sectionLines.slice(j, j + 3).join(', ');
          
          if (this.hasAddressComponents(potentialAddress)) {
            locations.push({
              locationName: sectionLines[j],
              locationAddress: sectionLines.slice(j + 1, j + 3).join(', '),
              sourceUrl,
              sourceType: 'pdf'
            });
          }
        }
      }
    }

    return locations;
  }

  /**
   * Check if text has typical address components
   */
  hasAddressComponents(text) {
    const indicators = [
      /\d{1,5}\s+[A-Z]/i, // Street number
      /\d{5}(?:-\d{4})?/, // US ZIP
      /\d{4}\s*[A-Z]{2}/i, // Netherlands postcode
      /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i, // UK postcode
      /tel:?|phone:?|fax:?/i, // Phone indicators
      /(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)/i
    ];

    return indicators.some(pattern => pattern.test(text));
  }

  /**
   * Get surrounding context for an address
   */
  getAddressContext(text, index, length) {
    const start = Math.max(0, index - length / 2);
    const end = Math.min(text.length, index + length / 2);
    return text.substring(start, end);
  }

  /**
   * Extract location name from context
   */
  extractLocationName(context) {
    const lines = context.split('\n').map(l => l.trim()).filter(l => l);
    
    // Look for lines that might be location names (before address)
    for (const line of lines) {
      if (line.length > 5 && line.length < 100) {
        // Check if it's not part of an address
        if (!/\d{5}|\d{4}\s*[A-Z]{2}/i.test(line) && !line.includes(',')) {
          return line;
        }
      }
    }
    
    return lines[0] || 'Location';
  }

  /**
   * Main method to extract all locations from PDF URL
   */
  async extractLocationsFromPdf(url) {
    try {
      // Extract text from PDF
      const pdfData = await this.extractTextFromPdf(url);
      
      // Extract locations from text
      const locations = this.extractLocationsFromText(pdfData.text, url);
      
      // Deduplicate locations
      const uniqueLocations = this.deduplicateLocations(locations);
      
      logger.info(`📄 Final result: ${uniqueLocations.length} unique locations from PDF`);
      
      return uniqueLocations;
    } catch (error) {
      logger.error(`Error extracting locations from PDF: ${error.message}`);
      return [];
    }
  }

  /**
   * Deduplicate locations based on address similarity
   */
  deduplicateLocations(locations) {
    const unique = [];
    const seen = new Set();

    for (const location of locations) {
      const key = `${location.locationAddress || ''}`.toLowerCase().replace(/\s+/g, '');
      
      if (!seen.has(key) && key.length > 5) {
        seen.add(key);
        unique.push(location);
      }
    }

    return unique;
  }
}

module.exports = new PdfExtractorService();
