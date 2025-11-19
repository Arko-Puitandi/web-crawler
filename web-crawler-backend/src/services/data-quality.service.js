const logger = require('../utils/logger');

class DataQualityService {
  /**
   * Calculate quality score for a location (0-100)
   */
  calculateQualityScore(location) {
    let score = 0;
    const weights = {
      locationName: 10,
      locationAddress: 20,
      latitude: 15,
      longitude: 15,
      countryIso3: 10,
      postcode: 8,
      state: 5,
      streetOrCity: 5,
      activityAtAsset: 5,
      footprint: 3,
      height: 2,
      phone: 1,
      email: 1
    };

    // Check each field and add weighted score
    Object.keys(weights).forEach(field => {
      if (location[field] && location[field].toString().length > 0) {
        score += weights[field];
      }
    });

    // Bonus points for complete geocoding
    if (location.latitude && location.longitude && 
        parseFloat(location.latitude) !== 0 && 
        parseFloat(location.longitude) !== 0) {
      score += 5;
    }

    // Penalty for obviously incomplete addresses
    if (location.locationAddress) {
      const addr = location.locationAddress.toLowerCase();
      if (addr.length < 10) score -= 10;
      if (addr === 'unknown' || addr === 'n/a') score -= 20;
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get quality level (Excellent, Good, Fair, Poor)
   */
  getQualityLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  }

  /**
   * Get quality color code
   */
  getQualityColor(score) {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#3b82f6'; // blue
    if (score >= 50) return '#f59e0b'; // yellow/orange
    return '#ef4444'; // red
  }

  /**
   * Get missing fields for a location
   */
  getMissingFields(location) {
    const requiredFields = [
      'locationName',
      'locationAddress', 
      'latitude',
      'longitude',
      'countryIso3',
      'postcode',
      'state',
      'streetOrCity'
    ];

    const missing = [];
    requiredFields.forEach(field => {
      if (!location[field] || location[field].toString().length === 0) {
        missing.push(field);
      }
    });

    return missing;
  }

  /**
   * Enrich location with quality metadata
   */
  enrichWithQuality(location) {
    const score = this.calculateQualityScore(location);
    
    return {
      ...location,
      qualityScore: score,
      qualityLevel: this.getQualityLevel(score),
      qualityColor: this.getQualityColor(score),
      missingFields: this.getMissingFields(location),
      completeness: `${Math.round(score)}%`
    };
  }

  /**
   * Generate quality report for batch of locations
   */
  generateQualityReport(locations) {
    const enriched = locations.map(loc => this.enrichWithQuality(loc));
    
    const report = {
      totalLocations: locations.length,
      excellent: enriched.filter(l => l.qualityScore >= 90).length,
      good: enriched.filter(l => l.qualityScore >= 70 && l.qualityScore < 90).length,
      fair: enriched.filter(l => l.qualityScore >= 50 && l.qualityScore < 70).length,
      poor: enriched.filter(l => l.qualityScore < 50).length,
      averageScore: enriched.reduce((sum, l) => sum + l.qualityScore, 0) / enriched.length,
      locations: enriched
    };

    logger.info(`\n📊 DATA QUALITY REPORT:`);
    logger.info(`   Total: ${report.totalLocations} locations`);
    logger.info(`   🟢 Excellent (90%+): ${report.excellent}`);
    logger.info(`   🔵 Good (70-89%): ${report.good}`);
    logger.info(`   🟡 Fair (50-69%): ${report.fair}`);
    logger.info(`   🔴 Poor (<50%): ${report.poor}`);
    logger.info(`   Average Score: ${Math.round(report.averageScore)}%\n`);

    return report;
  }
}

module.exports = new DataQualityService();
