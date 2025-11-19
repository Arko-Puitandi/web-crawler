/**
 * Professional Location Crawler (v2.0)
 * 
 * Strategy:
 * 1. Discover location pages (sitemap, robots.txt, common URLs)
 * 2. Check robots.txt and respect crawl-delay
 * 3. Try structured data first (JSON-LD, Microdata) - NO Puppeteer needed
 * 4. Fallback to HTML parsing if no structured data
 * 5. Use Puppeteer ONLY for JS-heavy sites
 * 6. Normalize and deduplicate addresses
 * 7. Rate limit per domain with exponential backoff
 */

const axios = require('axios');
const puppeteer = require('puppeteer');

const structuredDataExtractor = require('./structured-data-extractor.service');
const siteDiscovery = require('./site-discovery.service');
const politeness = require('./politeness.service');
const addressNormalizer = require('./address-normalizer.service');
const universalLocationExtractor = require('./universal-location-extractor.service');
const multiGeocodingService = require('./multi-geocoding.service');
const logger = require('../utils/logger');

class ProfessionalCrawler {
  constructor() {
    this.stats = {
      totalRequests: 0,
      structuredDataHits: 0,
      htmlParseHits: 0,
      puppeteerUses: 0,
      errors: 0
    };
  }

  /**
   * Main crawl method - intelligent routing
   */
  async crawl(urls, options = {}) {
    logger.info(`🚀 Professional Crawler v2.0 starting...`);
    logger.info(`📋 URLs to crawl: ${urls.length}`);
    
    const allLocations = [];
    
    for (const url of urls) {
      try {
        logger.info(`\n${'='.repeat(80)}`);
        logger.info(`🎯 Processing: ${url}`);
        logger.info(`${'='.repeat(80)}`);
        
        // Step 1: Check robots.txt
        const robotsCheck = await siteDiscovery.isAllowed(url);
        if (!robotsCheck.allowed) {
          logger.warn(`🚫 Blocked by robots.txt: ${url}`);
          continue;
        }
        
        // Step 2: Discover location pages if it's a homepage
        const isHomepage = this.isHomepage(url);
        let urlsToProcess = [url];
        
        if (isHomepage) {
          logger.info(`🏠 Homepage detected - discovering location pages...`);
          const discovery = await siteDiscovery.discoverLocationPages(url);
          
          if (discovery.urls.length > 0) {
            logger.info(`📍 Found ${discovery.urls.length} potential location pages`);
            urlsToProcess = discovery.urls.slice(0, 10); // Limit to top 10
          }
        }
        
        // Step 3: Process each URL
        for (const targetUrl of urlsToProcess) {
          try {
            const locations = await this.processUrl(targetUrl, robotsCheck.crawlDelay);
            allLocations.push(...locations);
            
            // Stop if we found enough locations
            if (allLocations.length >= 50 && !options.fetchAll) {
              logger.info(`✅ Found ${allLocations.length} locations - stopping early`);
              break;
            }
          } catch (error) {
            logger.error(`Error processing ${targetUrl}: ${error.message}`);
            politeness.recordFailure(targetUrl, error);
            this.stats.errors++;
          }
        }
        
      } catch (error) {
        logger.error(`Error crawling ${url}: ${error.message}`);
        this.stats.errors++;
      }
    }
    
    // Step 4: Normalize and deduplicate
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📊 POST-PROCESSING`);
    logger.info(`${'='.repeat(80)}`);
    
    const validLocations = addressNormalizer.filterValid(allLocations);
    const uniqueLocations = addressNormalizer.deduplicate(validLocations);
    
    // Step 5: Geocode if needed
    const finalLocations = await this.enrichWithGeocoding(uniqueLocations);
    
    // Log stats
    this.logStats(finalLocations);
    
    return finalLocations;
  }

  /**
   * Process single URL - try structured data first, fallback to HTML
   */
  async processUrl(url, crawlDelay) {
    logger.info(`\n📄 Processing: ${url}`);
    
    // Respect rate limiting
    await politeness.waitForDomain(url, crawlDelay);
    
    // Step 1: Try plain HTTP request first (fastest)
    try {
      const html = await this.fetchHtml(url);
      this.stats.totalRequests++;
      
      // Step 2: Try structured data extraction (JSON-LD, Microdata)
      const structuredLocations = await structuredDataExtractor.extract(html, url);
      
      if (structuredLocations.length > 0) {
        logger.info(`✅ Found ${structuredLocations.length} locations via structured data`);
        politeness.recordSuccess(url);
        this.stats.structuredDataHits++;
        return structuredLocations;
      }
      
      // Step 3: Fallback to universal HTML parsing
      logger.info(`🔍 No structured data found, trying universal HTML extraction...`);
      const htmlLocations = await universalLocationExtractor.extractAllLocations(html, url);
      
      if (htmlLocations.length > 0) {
        logger.info(`✅ Found ${htmlLocations.length} locations via HTML parsing`);
        politeness.recordSuccess(url);
        this.stats.htmlParseHits++;
        return htmlLocations;
      }
      
      logger.warn(`⚠️  No locations found on ${url}`);
      politeness.recordSuccess(url);
      return [];
      
    } catch (error) {
      logger.error(`Error processing ${url}: ${error.message}`);
      politeness.recordFailure(url, error);
      throw error;
    }
  }

  /**
   * Fetch HTML via plain HTTP (fastest - no browser overhead)
   */
  async fetchHtml(url) {
    try {
      const response = await axios.get(url, {
        headers: politeness.getHeaders(),
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });
      
      logger.debug(`✓ Fetched ${url} (${response.headers['content-length'] || 'unknown'} bytes)`);
      return response.data;
    } catch (error) {
      throw new Error(`HTTP fetch failed: ${error.message}`);
    }
  }

  /**
   * Check if page might need JavaScript rendering
   */
  mightNeedJavaScript(html) {
    // Look for signs of heavy JavaScript usage
    const indicators = [
      'react', 'vue', 'angular', 'ng-app', '__NEXT_DATA__',
      'data-react', 'data-reactroot', 'v-app', 'ng-version'
    ];
    
    const htmlLower = html.toLowerCase();
    return indicators.some(indicator => htmlLower.includes(indicator));
  }

  /**
   * Fetch with Puppeteer (only when needed - expensive)
   */
  async fetchWithPuppeteer(url) {
    let browser;
    try {
      logger.info(`🎭 Launching Puppeteer for ${url}...`);
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent(politeness.getUserAgent());
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for dynamic content to load
      await page.waitForTimeout(2000);
      
      const html = await page.content();
      await browser.close();
      
      // Try structured data first, then universal extraction
      const structuredLocations = await structuredDataExtractor.extract(html, url);
      if (structuredLocations.length > 0) {
        politeness.recordSuccess(url);
        return structuredLocations;
      }
      
      const htmlLocations = await universalLocationExtractor.extractAllLocations(html, url);
      politeness.recordSuccess(url);
      return htmlLocations;
      
    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  /**
   * Check if URL is a homepage
   */
  isHomepage(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname === '/' || urlObj.pathname === '';
    } catch {
      return false;
    }
  }

  /**
   * Enrich locations with geocoding
   */
  async enrichWithGeocoding(locations) {
    if (locations.length === 0) return [];
    
    logger.info(`\n🌍 Geocoding ${locations.length} locations...`);
    
    // Only geocode if missing coordinates
    const needGeocoding = locations.filter(loc => !loc.latitude || !loc.longitude);
    
    if (needGeocoding.length > 0) {
      logger.info(`📍 ${needGeocoding.length} locations need geocoding`);
      
      try {
        const enriched = await multiGeocodingService.enrichLocations(needGeocoding);
        
        // Merge back with locations that already had coordinates
        const withCoords = locations.filter(loc => loc.latitude && loc.longitude);
        return [...withCoords, ...enriched];
      } catch (error) {
        logger.error(`Geocoding failed: ${error.message}`);
        return locations;
      }
    }
    
    logger.info(`✅ All locations already have coordinates`);
    return locations;
  }

  /**
   * Log crawl statistics
   */
  logStats(finalLocations) {
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📊 CRAWL STATISTICS`);
    logger.info(`${'='.repeat(80)}`);
    logger.info(`Total HTTP Requests: ${this.stats.totalRequests}`);
    logger.info(`Structured Data Hits: ${this.stats.structuredDataHits} (${Math.round(this.stats.structuredDataHits/this.stats.totalRequests*100)}%)`);
    logger.info(`HTML Parsing Hits: ${this.stats.htmlParseHits}`);
    logger.info(`Puppeteer Uses: ${this.stats.puppeteerUses}`);
    logger.info(`Errors: ${this.stats.errors}`);
    logger.info(`Final Locations: ${finalLocations.length}`);
    logger.info(`${'='.repeat(80)}\n`);
    
    // Politeness stats
    const politenessStats = politeness.getAllStats();
    logger.info(`Rate Limiting Stats:`);
    logger.info(`  Domains Accessed: ${politenessStats.totalDomains}`);
    for (const [domain, stats] of Object.entries(politenessStats.domains)) {
      logger.info(`  ${domain}: ${stats.requests} requests, ${stats.failures} failures`);
    }
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      structuredDataHits: 0,
      htmlParseHits: 0,
      puppeteerUses: 0,
      errors: 0
    };
  }
}

module.exports = new ProfessionalCrawler();
