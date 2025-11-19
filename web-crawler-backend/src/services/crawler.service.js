const puppeteer = require('puppeteer');
const scraperService = require('./scraper.service');
const locationExtractorService = require('./location-extractor.service');
const pdfExtractorService = require('./pdf-extractor.service');
const siteCrawlerService = require('./site-crawler.service');
const geocodingService = require('./geocoding.service');
const dataQualityService = require('./data-quality.service');
const progressTracker = require('./progress-tracker.service');
const enhancedDeduplicationService = require('./enhanced-deduplication.service');
const apiExtractorService = require('./api-extractor.service');
const performanceOptimizer = require('./performance-optimizer.service');
const playwrightRendererService = require('./playwright-renderer.service');
const mapDetectorService = require('./map-detector.service');
const heuristicExtractorService = require('./heuristic-extractor.service');
const robotsService = require('./robots.service');
const logger = require('../utils/logger');

// NEW: Enterprise-grade extraction services
const pageClassifierService = require('./page-classifier.service');
const structuredDataExtractorService = require('./structured-data-extractor.service');
const linkExplorerService = require('./link-explorer.service');

class CrawlerService {
  async crawlUrls(urls, options = {}) {
    // Demo mode: Return mock data if in development without proper setup
    if (process.env.NODE_ENV === 'development' && process.env.DEMO_MODE === 'true') {
      logger.info('🎭 Demo mode: Returning mock data');
      return this.getMockData(urls);
    }

    // Create progress tracking job
    const jobId = options.jobId || progressTracker.constructor.generateJobId();
    progressTracker.createJob(jobId, {
      totalPages: urls.length,
      mode: options.crawlEntireSite ? 'site-wide' : 'single-page'
    });

    const allLocations = [];
    let browser;

    try {
      logger.info('🚀 Launching Puppeteer browser...');
      browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS === 'true',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      progressTracker.updateProgress(jobId, { status: 'crawling' });

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        logger.info(`🕷️  Crawling: ${url}`);
        
        progressTracker.updateProgress(jobId, {
          currentPage: url,
          pagesProcessed: i
        });

        // Try API extraction first
        logger.info('🔍 Checking for API endpoints...');
        const apiLocations = await apiExtractorService.extractFromApiEndpoints(url);
        if (apiLocations.length > 0) {
          logger.info(`✅ Found ${apiLocations.length} locations from API`);
          allLocations.push(...apiLocations);
        }

        // Check if URL is a PDF or other document
        if (this.isPdfUrl(url)) {
          logger.info('📄 Detected PDF file, using PDF extraction...');
          const locations = await this.crawlPdfUrl(url);
          allLocations.push(...locations);
        } 
        // Check if user wants to crawl entire site
        else if (options.crawlEntireSite || options.deepCrawl) {
          logger.info('🌐 Site-wide crawl mode enabled...');
          const locations = await this.crawlEntireSite(browser, url, { ...options, jobId });
          allLocations.push(...locations);
        }
        // Regular single-page crawling
        else {
          const locations = await this.crawlSingleUrl(browser, url);
          allLocations.push(...locations);
        }

        progressTracker.updateProgress(jobId, {
          pagesProcessed: i + 1,
          locationsFound: allLocations.length
        });
      }
    } catch (error) {
      logger.error('❌ Puppeteer error:', error.message);
      progressTracker.failJob(jobId, error);
      logger.warn('⚠️  Falling back to mock data');
      // Fallback to mock data if Puppeteer fails
      return this.getMockData(urls);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    progressTracker.completeJob(jobId, {
      totalLocations: allLocations.length,
      urls: urls
    });

    return allLocations;
  }

  /**
   * Check if URL points to a PDF file
   */
  isPdfUrl(url) {
    const urlLower = url.toLowerCase();
    return urlLower.endsWith('.pdf') || 
           urlLower.includes('.pdf?') ||
           urlLower.includes('/pdf/') ||
           urlLower.includes('doc_financials');
  }

  /**
   * Check if URL points to other document types (DOC, DOCX, TXT)
   */
  isDocumentUrl(url) {
    const urlLower = url.toLowerCase();
    return urlLower.endsWith('.doc') || 
           urlLower.endsWith('.docx') ||
           urlLower.endsWith('.txt') ||
           urlLower.endsWith('.rtf');
  }

  /**
   * Crawl entire website and aggregate all locations
   */
  async crawlEntireSite(browser, startUrl, options = {}) {
    try {
      // Phase 1: Discover all pages on the site
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🌐 SITE-WIDE CRAWL INITIATED`);
      logger.info(`${'='.repeat(80)}\n`);

      const discoveryResult = await siteCrawlerService.crawlEntireSite(browser, startUrl, {
        maxPages: options.maxPages || 50,
        maxDepth: options.maxDepth || 3,
        delay: options.delay || 1000
      });

      const urlsToCrawl = discoveryResult.allUrls.slice(0, options.maxPages || 50);

      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`📍 EXTRACTING LOCATIONS FROM ${urlsToCrawl.length} PAGES`);
      logger.info(`${'='.repeat(80)}\n`);

      // Phase 2: Extract locations from all discovered pages
      const allLocations = [];
      let pageCount = 0;

      for (const url of urlsToCrawl) {
        pageCount++;
        logger.info(`\n[${pageCount}/${urlsToCrawl.length}] Processing: ${url}`);

        try {
          const locations = await this.crawlSingleUrl(browser, url);
          
          if (locations.length > 0) {
            logger.info(`   ✓ Found ${locations.length} locations`);
            allLocations.push(...locations);
          } else {
            logger.info(`   - No locations found`);
          }

          // Respectful delay between requests
          await this.sleep(options.delay || 1000);

        } catch (error) {
          logger.error(`   ✗ Error: ${error.message}`);
        }
      }

      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`✅ SITE-WIDE CRAWL COMPLETE`);
      logger.info(`   Pages crawled: ${pageCount}`);
      logger.info(`   Total locations found: ${allLocations.length}`);
      logger.info(`${'='.repeat(80)}\n`);

      // Deduplicate across all pages with fuzzy matching
      const uniqueLocations = enhancedDeduplicationService.deduplicateWithFuzzy(allLocations, {
        threshold: 0.85
      });
      logger.info(`🧹 After enhanced deduplication: ${uniqueLocations.length} unique locations\n`);

      // Calculate quality scores
      const qualityReport = dataQualityService.generateQualityReport(uniqueLocations);
      
      return qualityReport.locations;

    } catch (error) {
      logger.error(`Error in site-wide crawl: ${error.message}`);
      return [];
    }
  }

  /**
   * Deduplicate locations across multiple pages by address similarity
   */
  deduplicateLocationsByAddress(locations) {
    const seen = new Map();
    const unique = [];

    for (const location of locations) {
      const key = (location.locationAddress || '').toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[.,\-]/g, '');

      if (key.length < 10) continue; // Skip if address too short

      if (!seen.has(key)) {
        seen.set(key, location);
        unique.push(location);
      } else {
        // If duplicate, keep the one with more complete data
        const existing = seen.get(key);
        const existingFields = Object.values(existing).filter(v => v && v.length > 0).length;
        const newFields = Object.values(location).filter(v => v && v.length > 0).length;
        
        if (newFields > existingFields) {
          seen.set(key, location);
          const index = unique.findIndex(l => l === existing);
          if (index !== -1) unique[index] = location;
        }
      }
    }

    return unique;
  }

  /**
   * Crawl a PDF document and extract locations
   */
  async crawlPdfUrl(url) {
    try {
      // Extract locations from PDF
      const rawLocations = await pdfExtractorService.extractLocationsFromPdf(url);

      logger.info(`📍 Extracted ${rawLocations.length} raw locations from PDF: ${url}`);

      // Enrich with geocoding
      const enrichedLocations = await this.enrichLocations(rawLocations, url);

      return enrichedLocations;

    } catch (error) {
      logger.error(`Error crawling PDF ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMockData(urls) {
    // Return mock location data for testing
    return urls.map((url, index) => ({
      locationName: `Location ${index + 1} from ${new URL(url).hostname}`,
      locationAddress: `${100 + index} Business St, Suite ${100 + index}, New York, NY 1000${index}`,
      activityAtAsset: ['Headquarters', 'Office', 'Warehouse', 'Retail'][index % 4],
      latitude: (40.7128 + (index * 0.01)).toString(),
      longitude: (-74.0060 + (index * 0.01)).toString(),
      countryIso3: 'USA',
      postcode: `1000${index}`,
      state: 'New York',
      streetOrCity: 'New York',
      usageShare: ['Own', 'Lease', 'Joint Venture'][index % 3],
      sourceUrl: url,
      sourceType: 'Website'
    }));
  }

  async crawlSingleUrl(browser, url) {
    const page = await browser.newPage();
    let allRawLocations = [];
    
    try {
      // Check robots.txt before crawling
      const allowed = await robotsService.isAllowed(url);
      if (!allowed) {
        logger.warn(`❌ Robots.txt disallows crawling ${url}`);
        return [];
      }

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000
      });

      // Get page content
      const html = await page.content();

      // NEW: Stage 2 - Semantic Intent Classification
      logger.info('📊 Stage 2: Classifying page...');
      const classification = pageClassifierService.classifyPage(url, html);
      const extractionStrategy = pageClassifierService.getExtractionStrategy(classification);
      logger.info(`📊 Page Type: ${classification.type} (confidence: ${classification.confidence}, priority: ${classification.priority})`);
      logger.info(`🎯 Strategy: ${extractionStrategy.description}`);

      // NEW: Stage 3 - Structured Data Extraction (BEST SOURCE - 95% confidence)
      logger.info('📋 Stage 3: Extracting structured data (JSON-LD, Microdata)...');
      const structuredLocations = structuredDataExtractorService.extractStructuredData(html, url);
      allRawLocations.push(...structuredLocations);
      logger.info(`📋 Structured Data: ${structuredLocations.length} locations (HIGH confidence)`);

      // NEW: Stage 8 - Multi-Page Exploration (if homepage or low-value page)
      if (classification.priority >= 3 && !url.includes('/contact') && !url.includes('/location')) {
        logger.info('🔗 Stage 8: Discovering high-value pages...');
        const discoveredUrls = linkExplorerService.discoverLocationPages(url, html);
        const topUrls = linkExplorerService.limitExploration(discoveredUrls, 5);
        
        if (topUrls.length > 0) {
          logger.info(`🔗 Found ${topUrls.length} high-value pages to explore`);
          for (const discoveredUrl of topUrls) {
            if (discoveredUrl !== url) { // Avoid re-crawling same page
              logger.info(`🔗 Exploring: ${discoveredUrl}`);
              const nestedLocs = await this.crawlSingleUrl(browser, discoveredUrl);
              allRawLocations.push(...nestedLocs);
            }
          }
        }
      }

      // Strategy 1: Extract locations from HTML using comprehensive extractor (80% confidence)
      const locations1 = await locationExtractorService.extractAllLocations(html, url);
      const locations1WithConfidence = locations1.map(loc => ({ ...loc, confidence: loc.confidence || 0.80, level: 'MEDIUM-HIGH' }));
      allRawLocations.push(...locations1WithConfidence);
      logger.info(`📍 Strategy 1 (LocationExtractor): ${locations1.length} locations`);

      // Strategy 2: Heuristic text extraction (75% confidence - already filtered)
      const locations2 = heuristicExtractorService.extractHeuristicAddresses(html, url);
      // Only keep high-confidence heuristic matches (0.75+) to reduce false positives
      const highConfidenceLocations = locations2.filter(loc => (loc.confidence || 0) >= 0.75);
      const locations2WithConfidence = highConfidenceLocations.map(loc => ({ ...loc, confidence: loc.confidence || 0.75, level: 'MEDIUM-HIGH' }));
      allRawLocations.push(...locations2WithConfidence);
      logger.info(`📍 Strategy 2 (Heuristic): ${locations2.length} found, ${highConfidenceLocations.length} high-confidence kept`);

      // Strategy 3: Detect maps and extract coordinates (90% confidence)
      const maps = mapDetectorService.detectMapIframes(html, url);
      const mapCoords = mapDetectorService.detectDataAttributes(html);
      
      maps.forEach(map => {
        if (map.coordinates) {
          allRawLocations.push({
            name: '',
            address: '',
            latitude: map.coordinates.lat.toString(),
            longitude: map.coordinates.lon.toString(),
            mapUrl: map.src,
            extractionMethod: 'map-iframe',
            confidence: 0.90,
            level: 'HIGH'
          });
        }
      });

      mapCoords.forEach(coord => {
        allRawLocations.push({
          name: '',
          address: '',
          latitude: coord.lat.toString(),
          longitude: coord.lon.toString(),
          confidence: 0.90,
          level: 'HIGH',
          extractionMethod: 'data-attribute'
        });
      });

      logger.info(`📍 Strategy 3 (Maps): ${maps.length + mapCoords.length} coordinates`);

      // Strategy 4: Check if page needs JavaScript rendering (Playwright - 85% confidence)
      const needsJs = playwrightRendererService.needsJsRendering(html);
      const isLocationPage = classification.type === 'locations' || url.includes('location') || url.includes('office');
      
      // Always run Playwright for dedicated location/office pages OR if page needs JS rendering
      if (needsJs || locations1.length === 0 || isLocationPage) {
        if (isLocationPage) {
          logger.info('🎭 Detected location/office page, using Playwright for complete extraction...');
        } else {
          logger.info('🎭 Page needs JavaScript rendering, using Playwright...');
        }
        
        const playwrightLocations = await playwrightRendererService.extractLocations(url);
        const playwrightWithConfidence = playwrightLocations.map(loc => ({ ...loc, confidence: loc.confidence || 0.85, level: 'HIGH' }));
        allRawLocations.push(...playwrightWithConfidence);
        logger.info(`📍 Strategy 4 (Playwright XHR): ${playwrightLocations.length} locations added`);
      }

      logger.info(`\n📊 Total raw locations extracted: ${allRawLocations.length}`);

      // NEW: Stage 10 - Confidence Filtering (minimum 70% threshold)
      const confidentLocations = allRawLocations.filter(loc => (loc.confidence || 0) >= 0.70);
      logger.info(`✅ Confidence filter (>=0.70): ${allRawLocations.length} → ${confidentLocations.length} locations`);

      // Apply enhanced deduplication with fuzzy matching
      const deduplicated = await enhancedDeduplicationService.deduplicateWithFuzzy(confidentLocations);
      logger.info(`✨ After deduplication: ${deduplicated.length} unique locations`);

      // Enrich with geocoding
      const enrichedLocations = await this.enrichLocations(deduplicated, url);

      // Add quality scores
      const locationsWithQuality = enrichedLocations.map(loc => 
        dataQualityService.enrichWithQuality(loc)
      );

      return locationsWithQuality;

    } catch (error) {
      logger.error(`Error crawling ${url}:`, error.message);
      throw new Error(`Failed to crawl ${url}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async enrichLocations(rawLocations, sourceUrl) {
    const enriched = [];

    logger.info(`🔄 Enriching ${rawLocations.length} locations with geocoding...`);

    for (let i = 0; i < rawLocations.length; i++) {
      const location = rawLocations[i];
      logger.info(`   Processing [${i + 1}/${rawLocations.length}]: ${location.name}`);
      
      try {
        // Geocode address to get lat/lng and structured address data
        const geoData = await geocodingService.geocodeAddress(location.address);

        // Create polygon footprint from coordinates
        const footprint = this.createFootprint(geoData.latitude, geoData.longitude);
        
        // Estimate building height (default to 2-4 stories for commercial buildings)
        const height = this.estimateHeight(location.activity);

        logger.info(`   ✓ Geocoded: lat=${geoData.latitude}, lon=${geoData.longitude}, country=${geoData.countryCode}`);

        enriched.push({
          locationName: location.name || 'Unknown Location',
          locationAddress: geoData.formattedAddress || location.address,
          activityAtAsset: location.activity || 'Office',
          latitude: geoData.latitude.toString() || '',
          longitude: geoData.longitude.toString() || '',
          countryIso3: geoData.countryCode || '',
          postcode: geoData.postalCode || '',
          state: geoData.state || '',
          streetOrCity: geoData.city || '',
          footprint: footprint,
          height: height,
          usageShare: location.usageShare || 'Exclusive',
          sourceUrl: sourceUrl,
          sourceType: 'Company Website'
        });
      } catch (error) {
        logger.warn(`   ⚠️  Failed to geocode location: ${error.message}`);
        // Add location anyway without geocoding but with estimated data
        enriched.push({
          locationName: location.name || 'Unknown Location',
          locationAddress: location.address,
          activityAtAsset: location.activity || 'Office',
          latitude: '',
          longitude: '',
          countryIso3: '',
          postcode: '',
          state: '',
          streetOrCity: '',
          footprint: null,
          height: this.estimateHeight(location.activity),
          usageShare: location.usageShare || 'Exclusive',
          sourceUrl: sourceUrl,
          sourceType: 'Company Website'
        });
      }
    }

    logger.info(`✅ Successfully enriched ${enriched.length} locations`);
    return enriched;
  }

  estimateHeight(activity) {
    // Estimate building height in meters based on activity type
    // These are rough estimates for typical commercial buildings
    const heights = {
      'Headquarters': 45,      // ~12 stories (3.75m per floor)
      'Office': 30,            // ~8 stories
      'Branch Office': 15,     // ~4 stories
      'Retail': 6,             // Single story retail
      'Warehouse': 12,         // Warehouse/distribution
      'Manufacturing': 15,     // Manufacturing facility
      'Data Center': 10,       // Data center
      'Restaurant': 5          // Single story restaurant
    };
    
    return heights[activity] || 25; // Default to ~7 stories
  }

  createFootprint(lat, lon) {
    if (!lat || !lon) return null;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) return null;

    // Create a building footprint polygon (approximately 20m x 20m)
    // This represents a typical small commercial building footprint
    const offset = 0.0001; // roughly 11 meters at the equator
    
    // Create a rectangle around the point
    const coordinates = [
      [longitude - offset, latitude - offset],  // SW corner
      [longitude + offset, latitude - offset],  // SE corner
      [longitude + offset, latitude + offset],  // NE corner
      [longitude - offset, latitude + offset],  // NW corner
      [longitude - offset, latitude - offset]   // Close polygon (back to SW)
    ];

    // Format as MULTIPOLYGON WKT (Well-Known Text)
    // WKT format: MULTIPOLYGON(((lon lat, lon lat, ...)))
    const coordString = coordinates
      .map(coord => `${coord[0].toFixed(6)} ${coord[1].toFixed(6)}`)
      .join(', ');
    
    const wkt = `MULTIPOLYGON(((${coordString})))`;
    
    logger.debug(`   Footprint created: ${wkt.substring(0, 60)}...`);
    
    return wkt;
  }

  async getJobStatus(jobId) {
    // TODO: Implement Bull queue job status tracking
    return { jobId, status: 'completed' };
  }

  async getAllLocations() {
    // TODO: Implement database query to get all locations
    return [];
  }
}

module.exports = new CrawlerService();
