const logger = require('../utils/logger');

class EnhancedDeduplicationService {
  /**
   * Deduplicate locations with fuzzy matching and data merging
   */
  deduplicateWithFuzzy(locations, options = {}) {
    const threshold = options.threshold || 0.85;
    const merged = [];
    const processed = new Set();

    logger.info(`🔍 Deduplicating ${locations.length} locations with fuzzy matching (threshold: ${threshold})`);

    for (let i = 0; i < locations.length; i++) {
      if (processed.has(i)) continue;

      const baseLocation = locations[i];
      const duplicates = [i];

      // Find all duplicates
      for (let j = i + 1; j < locations.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.calculateSimilarity(baseLocation, locations[j]);
        if (similarity >= threshold) {
          duplicates.push(j);
          processed.add(j);
        }
      }

      // Merge all duplicates
      const mergedLocation = this.mergeLocations(
        duplicates.map(idx => locations[idx])
      );

      merged.push(mergedLocation);
      processed.add(i);
    }

    logger.info(`✅ Deduplicated from ${locations.length} to ${merged.length} locations`);
    return merged;
  }

  /**
   * Calculate similarity between two locations (0-1)
   */
  calculateSimilarity(loc1, loc2) {
    let totalWeight = 0;
    let matchScore = 0;

    // Address similarity (weight: 0.4)
    if (loc1.locationAddress && loc2.locationAddress) {
      const addressSim = this.stringSimilarity(
        this.normalizeAddress(loc1.locationAddress),
        this.normalizeAddress(loc2.locationAddress)
      );
      matchScore += addressSim * 0.4;
      totalWeight += 0.4;
    }

    // Coordinates proximity (weight: 0.3)
    if (loc1.latitude && loc1.longitude && loc2.latitude && loc2.longitude) {
      const distance = this.haversineDistance(
        parseFloat(loc1.latitude),
        parseFloat(loc1.longitude),
        parseFloat(loc2.latitude),
        parseFloat(loc2.longitude)
      );
      
      // Consider same if within 100 meters
      const proximitySim = distance < 0.1 ? 1 : Math.max(0, 1 - distance / 5);
      matchScore += proximitySim * 0.3;
      totalWeight += 0.3;
    }

    // Name similarity (weight: 0.2)
    if (loc1.locationName && loc2.locationName) {
      const nameSim = this.stringSimilarity(
        loc1.locationName.toLowerCase(),
        loc2.locationName.toLowerCase()
      );
      matchScore += nameSim * 0.2;
      totalWeight += 0.2;
    }

    // Postcode match (weight: 0.1)
    if (loc1.postcode && loc2.postcode) {
      const postcodeSim = this.normalizePostcode(loc1.postcode) === 
        this.normalizePostcode(loc2.postcode) ? 1 : 0;
      matchScore += postcodeSim * 0.1;
      totalWeight += 0.1;
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  /**
   * Merge multiple locations into one, preferring complete data
   */
  mergeLocations(locations) {
    if (locations.length === 1) return locations[0];

    const merged = { ...locations[0] };
    
    // Merge each field, preferring non-empty values
    const fields = [
      'locationName', 'locationAddress', 'latitude', 'longitude',
      'countryIso3', 'postcode', 'state', 'streetOrCity',
      'activityAtAsset', 'footprint', 'height', 'usageShare'
    ];

    fields.forEach(field => {
      // Find the best value (longest/most complete)
      const values = locations
        .map(loc => loc[field])
        .filter(val => val && val.toString().length > 0);

      if (values.length > 0) {
        // For coordinates, prefer most precise
        if (field === 'latitude' || field === 'longitude') {
          merged[field] = values
            .sort((a, b) => b.toString().length - a.toString().length)[0];
        } else {
          // For text, prefer longest
          merged[field] = values
            .sort((a, b) => b.toString().length - a.toString().length)[0];
        }
      }
    });

    // Merge array fields (phone, email, hours)
    ['phone', 'email', 'hours', 'fax', 'website'].forEach(field => {
      const allValues = new Set();
      locations.forEach(loc => {
        if (Array.isArray(loc[field])) {
          loc[field].forEach(val => allValues.add(val));
        } else if (loc[field]) {
          allValues.add(loc[field]);
        }
      });
      if (allValues.size > 0) {
        merged[field] = Array.from(allValues);
      }
    });

    // Merge source URLs
    const sourceUrls = new Set(
      locations.map(loc => loc.sourceUrl).filter(Boolean)
    );
    merged.sourceUrl = Array.from(sourceUrls).join(', ');

    // Keep highest quality score
    const qualityScores = locations
      .map(loc => loc.qualityScore)
      .filter(score => score != null);
    if (qualityScores.length > 0) {
      merged.qualityScore = Math.max(...qualityScores);
    }

    // Mark as merged
    merged.mergedFrom = locations.length;

    return merged;
  }

  /**
   * Normalize address for comparison
   */
  normalizeAddress(address) {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/g, '')
      .trim();
  }

  /**
   * Normalize postcode for comparison
   */
  normalizePostcode(postcode) {
    return postcode
      .toUpperCase()
      .replace(/[^\w]/g, '')
      .trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  stringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }

  /**
   * Calculate distance between two coordinates (in km)
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * Math.PI / 180;
  }

  /**
   * Find potential duplicates without merging
   */
  findDuplicates(locations, threshold = 0.85) {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < locations.length; i++) {
      if (processed.has(i)) continue;

      const group = [i];
      for (let j = i + 1; j < locations.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.calculateSimilarity(locations[i], locations[j]);
        if (similarity >= threshold) {
          group.push(j);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        groups.push(group.map(idx => locations[idx]));
      }
      processed.add(i);
    }

    return groups;
  }
}

module.exports = new EnhancedDeduplicationService();
