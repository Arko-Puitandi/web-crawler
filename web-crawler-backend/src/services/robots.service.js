const RobotsParser = require('robots-parser');
const axios = require('axios');
const logger = require('../utils/logger');

const USER_AGENT = 'WebCrawlerBot/2.0 (+https://example.com/bot)';

class RobotsService {
  constructor() {
    this.parsers = new Map(); // Cache robots.txt parsers by host
  }

  /**
   * Fetch and parse robots.txt for a given URL's host
   * @param {string} url - The URL to check
   * @returns {Promise<Object>} - { ok: boolean, parser: RobotsParser, text: string }
   */
  async fetchRobotsForHost(url) {
    try {
      const u = new URL(url);
      const host = u.host;

      // Check cache
      if (this.parsers.has(host)) {
        return { ok: true, parser: this.parsers.get(host), text: '' };
      }

      const robotsUrl = `${u.protocol}//${host}/robots.txt`;
      logger.info(`Fetching robots.txt from: ${robotsUrl}`);

      const res = await axios.get(robotsUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 8000,
        validateStatus: status => status === 200
      });

      const parser = RobotsParser(robotsUrl, res.data);
      this.parsers.set(host, parser);

      return { ok: true, parser, text: res.data };
    } catch (error) {
      logger.warn(`robots.txt fetch failed for ${url}: ${error.message} (will proceed cautiously)`);
      
      // Return a permissive parser that always allows crawling
      const permissiveParser = {
        isAllowed: () => true,
        getCrawlDelay: () => 0,
        getSitemaps: () => []
      };

      const u = new URL(url);
      this.parsers.set(u.host, permissiveParser);

      return { ok: false, parser: permissiveParser, text: '' };
    }
  }

  /**
   * Check if a URL is allowed to be crawled
   * @param {string} url - The URL to check
   * @param {string} userAgent - Optional user agent (defaults to class USER_AGENT)
   * @returns {Promise<boolean>}
   */
  async isAllowed(url, userAgent = USER_AGENT) {
    try {
      const { parser } = await this.fetchRobotsForHost(url);
      return parser.isAllowed(url, userAgent);
    } catch (error) {
      logger.error(`Error checking robots.txt for ${url}:`, error);
      return true; // Be permissive on errors
    }
  }

  /**
   * Get crawl delay for a URL (in milliseconds)
   * @param {string} url - The URL to check
   * @param {string} userAgent - Optional user agent
   * @returns {Promise<number>} - Delay in milliseconds
   */
  async getCrawlDelay(url, userAgent = USER_AGENT) {
    try {
      const { parser } = await this.fetchRobotsForHost(url);
      const delay = parser.getCrawlDelay?.(userAgent) || 0;
      return delay * 1000; // Convert seconds to milliseconds
    } catch (error) {
      return 300; // Default 300ms delay
    }
  }

  /**
   * Get sitemaps declared in robots.txt
   * @param {string} url - The URL to check
   * @returns {Promise<string[]>}
   */
  async getSitemaps(url) {
    try {
      const { parser } = await this.fetchRobotsForHost(url);
      return parser.getSitemaps?.() || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear the robots.txt cache
   */
  clearCache() {
    this.parsers.clear();
  }

  /**
   * Get the user agent string used by this service
   */
  getUserAgent() {
    return USER_AGENT;
  }
}

module.exports = new RobotsService();
