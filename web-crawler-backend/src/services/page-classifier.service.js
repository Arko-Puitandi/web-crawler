const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Stage 2: Semantic Intent Classification
 * Classifies pages to determine extraction strategy priority
 */
class PageClassifierService {
  /**
   * Classify a page's intent based on URL and content
   * @param {string} url - Page URL
   * @param {string} html - Page HTML
   * @returns {Object} Classification result with type and confidence
   */
  classifyPage(url, html) {
    const urlClassification = this.classifyByUrl(url);
    const contentClassification = this.classifyByContent(html);
    
    // Combine both signals (URL is more reliable)
    const classification = {
      type: urlClassification.type || contentClassification.type || 'general',
      confidence: Math.max(urlClassification.confidence, contentClassification.confidence),
      signals: {
        url: urlClassification,
        content: contentClassification
      },
      priority: this.getPriority(urlClassification.type || contentClassification.type)
    };

    logger.info(`📊 Page classified as: ${classification.type} (confidence: ${classification.confidence})`);
    return classification;
  }

  /**
   * Classify by URL patterns
   */
  classifyByUrl(url) {
    const urlLower = url.toLowerCase();
    
    // High-value location pages
    const locationPatterns = [
      { pattern: /\/(locations?|offices?|branches?|stores?|centers?)[\/?]/i, type: 'locations', confidence: 0.95 },
      { pattern: /\/contact[-_]?us?[\/?]/i, type: 'contact', confidence: 0.90 },
      { pattern: /\/find[-_]?us[\/?]/i, type: 'locations', confidence: 0.85 },
      { pattern: /\/where[-_]?(we[-_]?are|to[-_]?find)[\/?]/i, type: 'locations', confidence: 0.85 },
      { pattern: /\/global[-_]?(offices?|footprint|presence|locations?)[\/?]/i, type: 'locations', confidence: 0.90 },
      { pattern: /\/worldwide[\/?]/i, type: 'locations', confidence: 0.85 },
      { pattern: /\/reach[-_]?us[\/?]/i, type: 'contact', confidence: 0.80 },
      { pattern: /\/about[-_]?(us|company)?[\/?]/i, type: 'about', confidence: 0.75 },
      { pattern: /\/company[\/?]/i, type: 'company', confidence: 0.75 },
      { pattern: /\/careers?\/country[\/?]/i, type: 'locations', confidence: 0.70 },
      { pattern: /\/investors?[\/?]/i, type: 'investor', confidence: 0.60 },
      { pattern: /\/(map|store[-_]?locator)[\/?]/i, type: 'locations', confidence: 0.95 }
    ];

    for (const { pattern, type, confidence } of locationPatterns) {
      if (pattern.test(urlLower)) {
        return { type, confidence, matchedPattern: pattern.source };
      }
    }

    return { type: null, confidence: 0 };
  }

  /**
   * Classify by page content (headings, keywords)
   */
  classifyByContent(html) {
    try {
      const $ = cheerio.load(html);
      
      // Extract all headings
      const headings = [];
      $('h1, h2, h3').each((i, el) => {
        headings.push($(el).text().trim().toLowerCase());
      });

      const allHeadings = headings.join(' ');

      // Check for location/contact keywords
      const keywords = {
        locations: ['office', 'location', 'branch', 'center', 'store', 'find us', 'where we are', 'global footprint', 'worldwide', 'our presence'],
        contact: ['contact us', 'get in touch', 'reach us', 'contact information'],
        about: ['about us', 'who we are', 'our company', 'company profile'],
        company: ['company', 'organization', 'enterprise']
      };

      let bestMatch = { type: null, confidence: 0 };

      for (const [type, words] of Object.entries(keywords)) {
        const matchCount = words.filter(word => allHeadings.includes(word)).length;
        if (matchCount > 0) {
          const confidence = Math.min(0.60 + (matchCount * 0.10), 0.85);
          if (confidence > bestMatch.confidence) {
            bestMatch = { type, confidence, matchedKeywords: matchCount };
          }
        }
      }

      return bestMatch;
    } catch (error) {
      logger.error('Error classifying page content:', error.message);
      return { type: null, confidence: 0 };
    }
  }

  /**
   * Get extraction priority based on page type
   */
  getPriority(pageType) {
    const priorities = {
      'locations': 1,      // Highest priority
      'contact': 1,
      'about': 2,
      'company': 2,
      'investor': 3,
      'general': 4         // Lowest priority
    };

    return priorities[pageType] || 4;
  }

  /**
   * Determine extraction aggressiveness based on classification
   */
  getExtractionStrategy(classification) {
    const { type, confidence, priority } = classification;

    if (priority === 1 && confidence >= 0.85) {
      return {
        aggressive: true,
        methods: ['json-ld', 'dom-blocks', 'heuristics', 'maps', 'xhr'],
        timeout: 45000,
        description: 'High-value page: Use all extraction methods'
      };
    } else if (priority <= 2 && confidence >= 0.70) {
      return {
        aggressive: true,
        methods: ['json-ld', 'dom-blocks', 'heuristics', 'maps'],
        timeout: 30000,
        description: 'Medium-value page: Use most extraction methods'
      };
    } else {
      return {
        aggressive: false,
        methods: ['json-ld', 'dom-blocks'],
        timeout: 20000,
        description: 'Low-value page: Use only reliable methods'
      };
    }
  }

  /**
   * Get list of high-value URLs to explore from a homepage
   */
  getHighValuePaths() {
    return [
      '/contact',
      '/contact-us',
      '/contactus',
      '/locations',
      '/offices',
      '/office',
      '/branches',
      '/stores',
      '/find-us',
      '/where-we-are',
      '/global-offices',
      '/global-locations',
      '/worldwide',
      '/about',
      '/about-us',
      '/company',
      '/who-we-are',
      '/careers/country',
      '/company/regions',
      '/investors',
      '/store-locator',
      '/map'
    ];
  }
}

module.exports = new PageClassifierService();
