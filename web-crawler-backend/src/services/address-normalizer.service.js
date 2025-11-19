/**
 * Address Normalizer and Deduplicator
 * Canonical address formatting, smart deduplication, ISO country codes
 */

const logger = require('../utils/logger');

class AddressNormalizer {
  constructor() {
    // Country code mapping (ISO 3166-1 alpha-2)
    this.countryMap = {
      'usa': 'US', 'united states': 'US', 'us': 'US', 'u.s.': 'US', 'u.s.a.': 'US',
      'uk': 'GB', 'united kingdom': 'GB', 'great britain': 'GB', 'england': 'GB',
      'australia': 'AU', 'aus': 'AU',
      'canada': 'CA', 'can': 'CA',
      'germany': 'DE', 'deutschland': 'DE',
      'france': 'FR',
      'spain': 'ES', 'españa': 'ES',
      'italy': 'IT', 'italia': 'IT',
      'netherlands': 'NL', 'holland': 'NL',
      'switzerland': 'CH', 'schweiz': 'CH',
      'india': 'IN',
      'china': 'CN',
      'japan': 'JP',
      'singapore': 'SG'
    };

    // Street type abbreviations
    this.streetAbbr = {
      'street': 'St', 'st.': 'St', 'str': 'St',
      'avenue': 'Ave', 'ave.': 'Ave', 'av': 'Ave',
      'road': 'Rd', 'rd.': 'Rd',
      'boulevard': 'Blvd', 'blvd.': 'Blvd',
      'drive': 'Dr', 'dr.': 'Dr',
      'lane': 'Ln', 'ln.': 'Ln',
      'court': 'Ct', 'ct.': 'Ct',
      'place': 'Pl', 'pl.': 'Pl',
      'square': 'Sq', 'sq.': 'Sq',
      'terrace': 'Ter', 'ter.': 'Ter',
      'parkway': 'Pkwy', 'pkwy.': 'Pkwy',
      'highway': 'Hwy', 'hwy.': 'Hwy',
      'building': 'Bldg', 'bldg.': 'Bldg',
      'suite': 'Ste', 'ste.': 'Ste',
      'floor': 'Fl', 'fl.': 'Fl', 'flr': 'Fl',
      'apartment': 'Apt', 'apt.': 'Apt'
    };
  }

  /**
   * Normalize a location object
   */
  normalize(location) {
    try {
      const normalized = {
        // Core fields
        id: location.id || this.generateId(location),
        locationName: this.normalizeText(location.locationName || location.name || ''),
        streetAddress: this.normalizeAddress(location.streetAddress || location.locationAddress || ''),
        city: this.normalizeText(location.city || location.streetOrCity || ''),
        state: this.normalizeState(location.state || ''),
        postalCode: this.normalizePostalCode(location.postalCode || location.postcode || ''),
        country: this.normalizeCountry(location.country || location.countryIso3 || ''),
        
        // Contact
        phone: this.normalizePhone(location.phone || ''),
        
        // Coordinates
        latitude: this.normalizeCoordinate(location.latitude),
        longitude: this.normalizeCoordinate(location.longitude),
        
        // Metadata
        sourceUrl: location.sourceUrl || '',
        sourceType: location.sourceType || 'html',
        hours: location.hours || null,
        rawJsonLd: location.rawJsonLd || null,
        verified: location.verified || false,
        
        // Timestamps
        firstSeen: location.firstSeen || new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      // Generate canonical key for deduplication
      normalized.canonicalKey = this.generateCanonicalKey(normalized);
      
      return normalized;
    } catch (error) {
      logger.error(`Error normalizing location: ${error.message}`);
      return null;
    }
  }

  /**
   * Normalize text (trim, single spaces, proper case)
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ');
  }

  /**
   * Normalize street address
   */
  normalizeAddress(address) {
    if (!address) return '';
    
    let normalized = this.normalizeText(address);
    
    // Standardize street types
    for (const [full, abbr] of Object.entries(this.streetAbbr)) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      normalized = normalized.replace(regex, abbr);
    }
    
    // Remove extra punctuation
    normalized = normalized.replace(/[,;]+$/, '');
    
    // Standardize spacing around numbers
    normalized = normalized.replace(/(\d+)\s*-\s*(\d+)/, '$1-$2'); // Suite 101 - 102 → Suite 101-102
    
    return normalized;
  }

  /**
   * Normalize state/region
   */
  normalizeState(state) {
    if (!state) return '';
    
    const normalized = state.trim().toUpperCase();
    
    // US state abbreviations
    const usStates = {
      'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
      'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
      'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
      'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
      'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
      'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
      'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
      'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
      'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
      'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
      'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
      'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
      'WISCONSIN': 'WI', 'WYOMING': 'WY'
    };
    
    return usStates[normalized] || normalized;
  }

  /**
   * Normalize postal code
   */
  normalizePostalCode(code) {
    if (!code) return '';
    
    // Remove spaces and hyphens, keep alphanumeric
    let normalized = String(code).toUpperCase().replace(/[\s-]/g, '');
    
    // US ZIP code: ensure 5 digits or 5+4
    if (/^\d{5}(\d{4})?$/.test(normalized)) {
      return normalized.length === 9 ? `${normalized.slice(0,5)}-${normalized.slice(5)}` : normalized;
    }
    
    // Canada: A1A 1A1 format
    if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalized)) {
      return `${normalized.slice(0,3)} ${normalized.slice(3)}`;
    }
    
    return normalized;
  }

  /**
   * Normalize country to ISO 3166-1 alpha-2
   */
  normalizeCountry(country) {
    if (!country) return '';
    
    const normalized = country.toLowerCase().trim();
    
    // Already 2-letter code
    if (/^[a-z]{2}$/i.test(normalized)) {
      return normalized.toUpperCase();
    }
    
    // Map from full name
    return this.countryMap[normalized]?.toUpperCase() || normalized.toUpperCase();
  }

  /**
   * Normalize phone number
   */
  normalizePhone(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters except + at start
    let normalized = String(phone).trim();
    const hasPlus = normalized.startsWith('+');
    normalized = normalized.replace(/[^\d]/g, '');
    
    // Add back + if it was there
    if (hasPlus && !normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    
    // US format: (555) 123-4567
    if (!hasPlus && normalized.length === 10) {
      return `(${normalized.slice(0,3)}) ${normalized.slice(3,6)}-${normalized.slice(6)}`;
    }
    
    // International format: +1-555-123-4567
    if (normalized.length === 11 && normalized.startsWith('1')) {
      return `+${normalized.slice(0,1)}-${normalized.slice(1,4)}-${normalized.slice(4,7)}-${normalized.slice(7)}`;
    }
    
    return normalized;
  }

  /**
   * Normalize coordinate
   */
  normalizeCoordinate(coord) {
    if (!coord) return null;
    const num = parseFloat(coord);
    return isNaN(num) ? null : num;
  }

  /**
   * Generate canonical key for deduplication
   */
  generateCanonicalKey(location) {
    // Use multiple fields to create unique key
    const parts = [
      location.locationName,
      location.streetAddress,
      location.city,
      location.postalCode
    ].filter(Boolean);
    
    if (parts.length === 0) {
      // Fallback to coordinates
      if (location.latitude && location.longitude) {
        return `coord_${location.latitude}_${location.longitude}`;
      }
      return null;
    }
    
    // Create normalized key
    return parts
      .join('|')
      .toLowerCase()
      .replace(/[^a-z0-9|]/g, '');
  }

  /**
   * Generate unique ID
   */
  generateId(location) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const sourceHash = this.hashCode(location.sourceUrl || '');
    return `loc_${timestamp}_${sourceHash}_${random}`;
  }

  /**
   * Simple hash code
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Deduplicate array of locations
   */
  deduplicate(locations) {
    const seen = new Map();
    const unique = [];
    
    for (const location of locations) {
      const normalized = this.normalize(location);
      
      if (!normalized || !normalized.canonicalKey) {
        continue;
      }
      
      const key = normalized.canonicalKey;
      
      if (seen.has(key)) {
        // Merge with existing (keep most complete)
        const existing = seen.get(key);
        const merged = this.mergeLocations(existing, normalized);
        seen.set(key, merged);
      } else {
        seen.set(key, normalized);
        unique.push(normalized);
      }
    }
    
    logger.info(`🧹 Deduplication: ${locations.length} → ${unique.length} locations`);
    return unique;
  }

  /**
   * Merge two location objects (keep most complete data)
   */
  mergeLocations(loc1, loc2) {
    const merged = { ...loc1 };
    
    // Take non-empty values from loc2
    for (const key of Object.keys(loc2)) {
      if (loc2[key] && !loc1[key]) {
        merged[key] = loc2[key];
      }
    }
    
    // Update lastSeen
    merged.lastSeen = new Date().toISOString();
    
    // Upgrade verified status
    if (loc2.verified && !loc1.verified) {
      merged.verified = true;
    }
    
    return merged;
  }

  /**
   * Validate location has minimum required data
   */
  isValid(location) {
    // Must have either:
    // 1. Name + (address OR city)
    // 2. Address + city
    // 3. Coordinates
    
    const hasName = Boolean(location.locationName);
    const hasAddress = Boolean(location.streetAddress);
    const hasCity = Boolean(location.city);
    const hasCoords = Boolean(location.latitude && location.longitude);
    
    return hasCoords || 
           (hasName && (hasAddress || hasCity)) ||
           (hasAddress && hasCity);
  }

  /**
   * Filter valid locations
   */
  filterValid(locations) {
    const valid = locations.filter(loc => this.isValid(loc));
    logger.info(`✅ Validation: ${locations.length} → ${valid.length} valid locations`);
    return valid;
  }
}

module.exports = new AddressNormalizer();
