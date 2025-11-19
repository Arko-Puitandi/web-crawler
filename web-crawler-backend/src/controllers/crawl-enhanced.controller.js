const crawlerService = require('../services/crawler.service');
const logger = require('../utils/logger');

/**
 * Enhanced controller with timeout handling and streaming support
 */
exports.crawlUrlsWithStreaming = async (req, res, next) => {
  try {
    const { url, urls } = req.body;
    const urlList = urls || [url];

    logger.info(`📡 Streaming crawl request for: ${urlList.join(', ')}`);

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial message
    res.write(`data: ${JSON.stringify({ type: 'init', message: 'Starting extraction...' })}\n\n`);

    // Progress callback
    const onProgress = (stage, data) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', stage, data })}\n\n`);
    };

    // Start crawling with progress callbacks
    const results = await crawlerService.crawlUrlsWithProgress(urlList, {
      onProgress,
      maxTimeout: 120000 // 2 minutes max
    });

    // Send final results
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      data: results, 
      totalRecords: results.length 
    })}\n\n`);

    res.end();

  } catch (error) {
    logger.error('❌ Streaming crawl error:', error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Standard crawl with timeout protection
 */
exports.crawlUrlsSafe = async (req, res, next) => {
  try {
    const { url, urls, timeout = 60000 } = req.body;
    const urlList = urls || [url];

    logger.info(`🕷️ Safe crawl request for: ${urlList.join(', ')}`);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - please try with fewer URLs or enable streaming')), timeout);
    });

    // Race between crawl and timeout
    const results = await Promise.race([
      crawlerService.crawlUrls(urlList, { quickMode: true }),
      timeoutPromise
    ]);

    res.json({
      success: true,
      data: results,
      totalRecords: results.length,
      crawledAt: new Date().toISOString()
    });

  } catch (error) {
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'The extraction is taking longer than expected. Please try: 1) Use fewer URLs, 2) Enable streaming mode, or 3) Try again later.',
        suggestion: 'Use POST /api/crawl/stream for long-running extractions'
      });
    }

    logger.error('❌ Safe crawl error:', error.message);
    next(error);
  }
};

module.exports = exports;
