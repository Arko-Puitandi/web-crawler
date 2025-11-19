const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { URL } = require('url');

/**
 * Stage 8: Multi-Page Exploration (Internal Link Following)
 * Automatically discovers and crawls high-value pages
 */
class LinkExplorerService {
  /**
   * Discover high-value location pages from a homepage
   * @param {string} baseUrl - Base URL
   * @param {string} html - Homepage HTML
   * @returns {Array} Array of prioritized URLs to crawl
   */
  discoverLocationPages(baseUrl, html) {
    const discoveredUrls = new Set();
    
    try {
      const $ = cheerio.load(html);
      const baseUrlObj = new URL(baseUrl);

      // Priority 1: Direct path matches
      const highValuePaths = this.getHighValuePaths();
      for (const path of highValuePaths) {
        const fullUrl = new URL(path, baseUrl).href;
        discoveredUrls.add(fullUrl);
      }

      // Priority 2: Links with location-related text
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().toLowerCase();
        
        if (this.isLocationLink(href, text)) {
          try {
            const absoluteUrl = new URL(href, baseUrl).href;
            const urlObj = new URL(absoluteUrl);
            
            // Only same domain
            if (urlObj.hostname === baseUrlObj.hostname) {
              discoveredUrls.add(absoluteUrl);
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });

      const urls = Array.from(discoveredUrls);
      logger.info(`🔗 Discovered ${urls.length} potential location pages`);
      
      // Sort by priority
      return this.sortByPriority(urls);
    } catch (error) {
      logger.error('Error discovering location pages:', error.message);
      return [];
    }
  }

  /**
   * Get high-value paths to check
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

  /**
   * Check if link text/href indicates location page
   */
  isLocationLink(href, text) {
    const hrefLower = href.toLowerCase();
    const textLower = text.toLowerCase();

    const locationKeywords = [
      'contact', 'location', 'office', 'branch', 'store', 'center',
      'find us', 'where we are', 'reach us', 'get in touch',
      'global', 'worldwide', 'international', 'country', 'region',
      'about', 'company', 'who we are', 'careers'
    ];

    // Check href
    for (const keyword of locationKeywords) {
      if (hrefLower.includes(keyword)) return true;
    }

    // Check link text
    for (const keyword of locationKeywords) {
      if (textLower.includes(keyword)) return true;
    }

    return false;
  }

  /**
   * Sort URLs by priority
   */
  sortByPriority(urls) {
    const priorityPatterns = [
      { pattern: /\/(locations?|offices?|stores?)[\/?]/i, priority: 1 },
      { pattern: /\/contact/i, priority: 1 },
      { pattern: /\/global/i, priority: 2 },
      { pattern: /\/about/i, priority: 3 },
      { pattern: /\/company/i, priority: 3 },
      { pattern: /\/careers/i, priority: 4 }
    ];

    return urls.sort((a, b) => {
      const aPriority = this.getUrlPriority(a, priorityPatterns);
      const bPriority = this.getUrlPriority(b, priorityPatterns);
      return aPriority - bPriority;
    });
  }

  /**
   * Get priority score for URL
   */
  getUrlPriority(url, patterns) {
    for (const { pattern, priority } of patterns) {
      if (pattern.test(url)) {
        return priority;
      }
    }
    return 999; // Lowest priority
  }

  /**
   * Filter URLs to limit exploration depth
   */
  limitExploration(urls, maxPages = 10) {
    return urls.slice(0, maxPages);
  }
}

module.exports = new LinkExplorerService();
