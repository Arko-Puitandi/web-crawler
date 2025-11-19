const logger = require('../utils/logger');

class SiteCrawlerService {
  /**
   * Discover all internal links on a website
   */
  async discoverAllLinks(page, baseUrl) {
    const discoveredLinks = new Set();
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;

    try {
      // Get all links on the current page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
      });

      logger.info(`   Found ${links.length} links on page`);

      // Filter and normalize links
      for (const link of links) {
        try {
          const linkUrl = new URL(link);
          
          // Only include internal links (same domain)
          if (linkUrl.hostname === baseDomain || linkUrl.hostname === `www.${baseDomain}` || `www.${linkUrl.hostname}` === baseDomain) {
            // Remove query parameters and fragments for deduplication
            const cleanUrl = `${linkUrl.origin}${linkUrl.pathname}`;
            
            // Skip if it matches exclusion patterns
            if (!this.shouldExcludeUrl(cleanUrl)) {
              discoveredLinks.add(cleanUrl);
            }
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }

      return Array.from(discoveredLinks);
    } catch (error) {
      logger.error(`Error discovering links: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if URL should be excluded from crawling
   */
  shouldExcludeUrl(url) {
    const urlLower = url.toLowerCase();
    
    // Exclude file downloads
    const fileExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.pdf', 
                           '.zip', '.rar', '.tar', '.gz', '.exe', '.dmg',
                           '.mp4', '.avi', '.mov', '.mp3', '.wav',
                           '.css', '.js', '.json', '.xml', '.txt'];
    if (fileExtensions.some(ext => urlLower.endsWith(ext))) {
      return true;
    }

    // Exclude common non-location pages
    const excludePatterns = [
      '/login', '/signin', '/signup', '/register',
      '/cart', '/checkout', '/payment',
      '/search', '/filter',
      '/admin', '/wp-admin', '/dashboard',
      '/blog', '/news', '/article', '/post',
      '/product', '/item', '/category',
      '/privacy', '/terms', '/cookie',
      '/careers/job', '/jobs/', '/apply',
      '/download', '/upload',
      '#', // Anchor links
    ];

    return excludePatterns.some(pattern => urlLower.includes(pattern));
  }

  /**
   * Prioritize URLs that are more likely to contain location data
   */
  prioritizeUrls(urls) {
    const priority = {
      high: [],
      medium: [],
      low: []
    };

    urls.forEach(url => {
      const urlLower = url.toLowerCase();
      
      // High priority: likely to have locations
      if (urlLower.includes('/contact') || 
          urlLower.includes('/location') || 
          urlLower.includes('/office') || 
          urlLower.includes('/store') ||
          urlLower.includes('/branch') ||
          urlLower.includes('/find') ||
          urlLower.includes('/where') ||
          urlLower.includes('/address') ||
          urlLower.includes('/about/us') ||
          urlLower.match(/\/locations?$/)) {
        priority.high.push(url);
      }
      // Medium priority: might have locations
      else if (urlLower.includes('/about') || 
               urlLower.includes('/company') ||
               urlLower.includes('/corporate') ||
               urlLower.includes('/headquarter') ||
               urlLower.includes('/facility') ||
               urlLower.includes('/site')) {
        priority.medium.push(url);
      }
      // Low priority: unlikely but possible
      else {
        priority.low.push(url);
      }
    });

    // Return in priority order
    return [...priority.high, ...priority.medium, ...priority.low];
  }

  /**
   * Crawl entire site starting from homepage
   */
  async crawlEntireSite(browser, startUrl, options = {}) {
    const maxPages = options.maxPages || 50; // Limit to prevent infinite crawls
    const maxDepth = options.maxDepth || 3;
    const delay = options.delay || 1000; // ms between requests
    
    const visited = new Set();
    const toVisit = [{ url: startUrl, depth: 0 }];
    const allDiscoveredUrls = new Set([startUrl]);

    logger.info(`🔍 Starting site-wide crawl of: ${startUrl}`);
    logger.info(`   Max pages: ${maxPages}, Max depth: ${maxDepth}`);

    // Phase 1: Discovery - Navigate pages and collect all links
    while (toVisit.length > 0 && visited.size < maxPages) {
      const { url, depth } = toVisit.shift();

      if (visited.has(url) || depth > maxDepth) {
        continue;
      }

      visited.add(url);
      logger.info(`   [${visited.size}/${maxPages}] Discovering: ${url} (depth: ${depth})`);

      try {
        const page = await browser.newPage();
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });

        // Discover all links on this page
        const links = await this.discoverAllLinks(page, startUrl);
        
        // Add new links to visit queue
        links.forEach(link => {
          if (!visited.has(link) && !allDiscoveredUrls.has(link)) {
            allDiscoveredUrls.add(link);
            toVisit.push({ url: link, depth: depth + 1 });
          }
        });

        await page.close();

        // Respectful delay between requests
        await this.sleep(delay);

      } catch (error) {
        logger.error(`   Error visiting ${url}: ${error.message}`);
      }
    }

    // Phase 2: Prioritize URLs for location extraction
    const allUrls = Array.from(allDiscoveredUrls);
    const prioritizedUrls = this.prioritizeUrls(allUrls);

    logger.info(`\n📊 Discovery Complete:`);
    logger.info(`   Total pages discovered: ${allUrls.length}`);
    logger.info(`   Pages visited: ${visited.size}`);
    logger.info(`   High priority pages: ${prioritizedUrls.slice(0, Math.min(10, prioritizedUrls.length)).length}`);

    return {
      allUrls: prioritizedUrls,
      visitedCount: visited.size,
      totalDiscovered: allUrls.length
    };
  }

  /**
   * Extract sitemap URLs if available
   */
  async extractFromSitemap(startUrl) {
    const urls = [];
    const baseUrlObj = new URL(startUrl);
    const sitemapUrls = [
      `${baseUrlObj.origin}/sitemap.xml`,
      `${baseUrlObj.origin}/sitemap_index.xml`,
      `${baseUrlObj.origin}/sitemap/sitemap.xml`,
    ];

    try {
      const axios = require('axios');
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await axios.get(sitemapUrl, { timeout: 5000 });
          
          if (response.status === 200 && response.data) {
            // Parse XML sitemap
            const urlMatches = response.data.match(/<loc>(.*?)<\/loc>/g);
            if (urlMatches) {
              urlMatches.forEach(match => {
                const url = match.replace(/<\/?loc>/g, '');
                if (!this.shouldExcludeUrl(url)) {
                  urls.push(url);
                }
              });
            }
            
            logger.info(`   Found ${urlMatches?.length || 0} URLs in sitemap: ${sitemapUrl}`);
            break; // Found a working sitemap
          }
        } catch (e) {
          // Sitemap doesn't exist, continue
        }
      }
    } catch (error) {
      logger.error(`Error extracting sitemap: ${error.message}`);
    }

    return urls;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SiteCrawlerService();
