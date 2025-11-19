const { chromium } = require('playwright');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const USER_AGENT = 'WebCrawlerBot/2.0 (+https://example.com/bot)';

class PlaywrightRendererService {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  /**
   * Initialize browser (reuse across requests)
   */
  async initBrowser() {
    if (!this.browser) {
      logger.info('🎭 Launching Playwright Chromium browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      this.context = await this.browser.newContext({ userAgent: USER_AGENT });
    }
    return this.browser;
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close().catch(err => logger.error('Error closing browser:', err));
      this.browser = null;
      this.context = null;
    }
  }

  /**
   * Render page with Playwright and extract data
   * @param {string} url - URL to render
   * @param {Object} options - Rendering options
   * @returns {Promise<Object>} - { html, xhrData, screenshots, console }
   */
  async renderPage(url, options = {}) {
    const {
      waitForNetwork = true,
      timeout = 30000,
      captureXhr = true,
      captureScreenshot = false,
      waitForSelector = null,
      executeScript = null
    } = options;

    await this.initBrowser();
    const page = await this.context.newPage();
    
    const xhrData = [];
    const consoleMessages = [];
    const errors = [];

    try {
      // Set up XHR/Fetch interception
      if (captureXhr) {
        page.on('response', async (response) => {
          try {
            const contentType = response.headers()['content-type'] || '';
            const url = response.url();
            
            // Only capture JSON responses
            if (contentType.includes('application/json')) {
              const text = await response.text().catch(() => null);
              if (text) {
                try {
                  const json = JSON.parse(text);
                  xhrData.push({
                    url,
                    status: response.status(),
                    data: json,
                    contentType
                  });
                } catch (e) {
                  // Not valid JSON
                }
              }
            }
          } catch (error) {
            // Ignore response errors
          }
        });
      }

      // Capture console messages
      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text()
        });
      });

      // Capture page errors
      page.on('pageerror', error => {
        errors.push(error.message);
      });

      // Navigate to page
      logger.info(`🎭 Rendering page: ${url}`);
      await page.goto(url, {
        waitUntil: waitForNetwork ? 'networkidle' : 'domcontentloaded',
        timeout
      }).catch(err => {
        logger.warn(`Navigation warning for ${url}:`, err.message);
      });

      // Wait for specific selector if provided
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 5000 }).catch(() => {
          logger.warn(`Selector ${waitForSelector} not found on page`);
        });
      }

      // Execute custom script if provided
      let scriptResult = null;
      if (executeScript) {
        scriptResult = await page.evaluate(executeScript).catch(err => {
          logger.warn('Script execution error:', err.message);
          return null;
        });
      }

      // Wait a bit for XHR requests to complete
      await page.waitForTimeout(1500);

      // Get rendered HTML
      const html = await page.content();

      // Optionally capture screenshot
      let screenshot = null;
      if (captureScreenshot) {
        screenshot = await page.screenshot({
          fullPage: false,
          type: 'png'
        }).catch(() => null);
      }

      await page.close().catch(() => {});

      return {
        html,
        xhrData,
        consoleMessages,
        errors,
        screenshot,
        scriptResult,
        success: true
      };

    } catch (error) {
      logger.error(`Playwright render error for ${url}:`, error.message);
      await page.close().catch(() => {});
      
      return {
        html: '',
        xhrData: [],
        consoleMessages: [],
        errors: [error.message],
        screenshot: null,
        scriptResult: null,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract locations from rendered page
   * @param {string} url - URL to render and extract
   * @returns {Promise<Array>} - Array of discovered locations
   */
  async extractLocations(url) {
    const result = await this.renderPage(url, {
      waitForNetwork: true,
      captureXhr: true,
      timeout: 30000
    });

    if (!result.success) {
      logger.warn(`Failed to render ${url}`);
      return [];
    }

    const locations = [];
    const $ = cheerio.load(result.html);

    // Parse XHR data for locations
    for (const xhr of result.xhrData) {
      const xhrLocations = this.parseJsonForLocations(xhr.data, xhr.url);
      locations.push(...xhrLocations);
    }

    logger.info(`Playwright extracted ${locations.length} locations from XHR data`);
    return locations;
  }

  /**
   * Parse JSON data recursively for location information
   * @param {any} data - JSON data to parse
   * @param {string} source - Source URL
   * @returns {Array} - Array of locations
   */
  parseJsonForLocations(data, source) {
    const locations = [];

    const scan = (obj, depth = 0) => {
      if (depth > 10 || !obj || typeof obj !== 'object') return;

      // Check if this object looks like a location
      const hasCoords = (obj.lat && obj.lon) || 
                       (obj.latitude && obj.longitude) ||
                       (obj.lat && obj.lng);
      
      const hasAddress = obj.address || obj.street || obj.city || 
                        obj.postalCode || obj.postal_code || obj.zip;

      if (hasCoords || hasAddress) {
        locations.push({
          name: obj.name || obj.title || obj.location_name || '',
          street: obj.address || obj.street || obj.street_address || '',
          city: obj.city || obj.locality || '',
          state: obj.state || obj.region || obj.state_province || '',
          postalCode: obj.postalCode || obj.postal_code || obj.zip || obj.postcode || '',
          country: obj.country || obj.country_code || '',
          phone: obj.phone || obj.telephone || obj.phone_number || '',
          email: obj.email || '',
          lat: obj.lat || obj.latitude || null,
          lon: obj.lon || obj.lng || obj.longitude || null,
          source,
          raw: obj
        });
      }

      // Recursively scan nested objects and arrays
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach(item => scan(item, depth + 1));
        } else if (typeof obj[key] === 'object') {
          scan(obj[key], depth + 1);
        }
      }
    };

    scan(data);
    return locations;
  }

  /**
   * Check if page needs JavaScript rendering
   * @param {string} html - HTML content
   * @returns {boolean}
   */
  needsJsRendering(html) {
    const $ = cheerio.load(html);
    
    // Check for common JS frameworks
    const hasReact = html.includes('react') || html.includes('React') || $('[data-reactroot]').length > 0;
    const hasVue = html.includes('vue') || html.includes('Vue') || $('[data-v-]').length > 0;
    const hasAngular = html.includes('angular') || html.includes('ng-') || $('[ng-app]').length > 0;
    const hasEmptyBody = $('body').children().length < 3;
    const hasMinimalContent = $('body').text().trim().length < 200;

    return hasReact || hasVue || hasAngular || hasEmptyBody || hasMinimalContent;
  }
}

module.exports = new PlaywrightRendererService();
