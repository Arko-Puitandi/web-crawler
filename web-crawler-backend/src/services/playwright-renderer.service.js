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

    // Log all XHR endpoints for debugging
    if (result.xhrData.length > 0) {
      logger.info(`🔍 Captured ${result.xhrData.length} XHR/API responses:`);
      result.xhrData.forEach((xhr, idx) => {
        const dataSize = JSON.stringify(xhr.data).length;
        logger.info(`  [${idx + 1}] ${xhr.url} (${xhr.status}) - ${dataSize} bytes`);
      });
    }

    // Parse XHR data for locations
    for (const xhr of result.xhrData) {
      const xhrLocations = this.parseJsonForLocations(xhr.data, xhr.url);
      locations.push(...xhrLocations);
    }

    logger.info(`🎭 Playwright extracted ${locations.length} locations from ${result.xhrData.length} XHR responses`);
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

    const scan = (obj, depth = 0, parentKey = '') => {
      if (depth > 15 || !obj || typeof obj !== 'object') return;

      // Expanded field name variations
      const hasCoords = (obj.lat && obj.lon) || 
                       (obj.latitude && obj.longitude) ||
                       (obj.lat && obj.lng) ||
                       (obj.Latitude && obj.Longitude) ||
                       (obj.coordinates && typeof obj.coordinates === 'object') ||
                       (obj.location && obj.location.lat && obj.location.lon);
      
      const hasAddress = obj.address || obj.street || obj.city || 
                        obj.postalCode || obj.postal_code || obj.zip ||
                        obj.Address || obj.City || obj.State || obj.Country ||
                        obj.addressLine1 || obj.street1 || obj.streetAddress ||
                        obj.location_address || obj.full_address;

      // Check for office/location-specific fields
      const hasOfficeFields = obj.office || obj.officeName || obj.office_name ||
                             obj.location || obj.locationName || obj.location_name ||
                             obj.siteName || obj.site_name || obj.branch ||
                             obj.type === 'office' || obj.type === 'location';

      if (hasCoords || hasAddress || hasOfficeFields) {
        // Extract coordinates from various structures
        let lat = obj.lat || obj.latitude || obj.Latitude || null;
        let lon = obj.lon || obj.lng || obj.longitude || obj.Longitude || null;
        
        if (obj.coordinates) {
          lat = obj.coordinates.lat || obj.coordinates.latitude || lat;
          lon = obj.coordinates.lon || obj.coordinates.lng || obj.coordinates.longitude || lon;
        }
        
        if (obj.location && typeof obj.location === 'object') {
          lat = obj.location.lat || obj.location.latitude || lat;
          lon = obj.location.lon || obj.location.lng || obj.location.longitude || lon;
        }

        // Build complete address from various fields
        const street = obj.address || obj.street || obj.street_address || obj.streetAddress ||
                      obj.addressLine1 || obj.address_line1 || obj.street1 || 
                      obj.Address || obj.full_address || '';

        const city = obj.city || obj.City || obj.locality || obj.town || '';
        const state = obj.state || obj.State || obj.region || obj.province || 
                     obj.state_province || obj.stateProvince || '';
        const postalCode = obj.postalCode || obj.postal_code || obj.zip || 
                          obj.postcode || obj.zipcode || obj.PostalCode || '';
        const country = obj.country || obj.Country || obj.country_code || 
                       obj.countryCode || obj.nation || '';

        locations.push({
          name: obj.name || obj.title || obj.location_name || obj.locationName ||
                obj.office_name || obj.officeName || obj.siteName || obj.site_name ||
                obj.branch || obj.label || '',
          street: street,
          city: city,
          state: state,
          postalCode: postalCode,
          country: country,
          phone: obj.phone || obj.telephone || obj.phone_number || obj.phoneNumber ||
                 obj.tel || obj.Phone || '',
          email: obj.email || obj.Email || obj.emailAddress || '',
          lat: lat,
          lon: lon,
          source,
          extractionMethod: 'playwright-xhr',
          confidence: 0.85,
          level: 'HIGH',
          raw: obj
        });
      }

      // Recursively scan nested objects and arrays
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          // Log arrays that might contain locations
          if (obj[key].length > 5 && obj[key].length < 200 && typeof obj[key][0] === 'object') {
            logger.info(`🔍 Scanning array '${key}' with ${obj[key].length} items from ${source}`);
          }
          obj[key].forEach(item => scan(item, depth + 1, key));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          scan(obj[key], depth + 1, key);
        }
      }
    };

    scan(data);
    
    if (locations.length > 0) {
      logger.info(`✅ Extracted ${locations.length} locations from ${source}`);
    }
    
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
