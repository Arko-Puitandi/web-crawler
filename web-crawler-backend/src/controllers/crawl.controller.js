const crawlerService = require('../services/crawler.service');
const cacheService = require('../services/cache.service');
const logger = require('../utils/logger');

exports.crawlUrls = async (req, res, next) => {
  try {
    const { url, urls, crawlEntireSite, deepCrawl, maxPages, maxDepth } = req.body;
    const urlList = urls || [url];

    const isSiteCrawl = crawlEntireSite || deepCrawl;
    
    // Generate job ID
    const progressTracker = require('../services/progress-tracker.service');
    const jobId = progressTracker.constructor.generateJobId();
    
    if (isSiteCrawl) {
      logger.info(`🌐 Site-wide crawl request for: ${urlList.join(', ')}`);
    } else {
      logger.info(`Crawl request received for ${urlList.length} URLs: ${urlList.join(', ')}`);
    }

    // Check cache first (skip cache for site-wide crawls)
    const cacheKey = `crawl:${urlList.join(',')}-${isSiteCrawl ? 'site' : 'single'}`;
    const cached = !isSiteCrawl ? await cacheService.get(cacheKey) : null;
    
    if (cached) {
      logger.info('✅ Returning cached data');
      return res.json({
        success: true,
        data: cached,
        totalRecords: cached.length,
        cached: true,
        crawledAt: new Date().toISOString()
      });
    }

    // Process crawling with options
    logger.info('🕷️  Starting crawl process...');
    const results = await crawlerService.crawlUrls(urlList, {
      jobId,
      crawlEntireSite: isSiteCrawl,
      maxPages: maxPages || 50,
      maxDepth: maxDepth || 3,
      delay: 1000
    });
    
    logger.info(`✅ Successfully crawled ${results.length} locations`);

    // Cache results
    await cacheService.set(cacheKey, results, process.env.CACHE_TTL || 86400);

    res.json({
      success: true,
      data: results,
      totalRecords: results.length,
      cached: false,
      mode: isSiteCrawl ? 'site-wide' : 'single-page',
      jobId,
      crawledAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Crawl error:', error.message);
    next(error);
  }
};

exports.getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = await crawlerService.getJobStatus(jobId);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

exports.getLocations = async (req, res, next) => {
  try {
    const locations = await crawlerService.getAllLocations();
    res.json({
      success: true,
      data: locations,
      totalRecords: locations.length
    });
  } catch (error) {
    next(error);
  }
};
