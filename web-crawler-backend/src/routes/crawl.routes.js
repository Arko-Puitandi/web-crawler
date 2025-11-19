const express = require('express');
const router = express.Router();
const crawlController = require('../controllers/crawl.controller');
const enhancedController = require('../controllers/crawl-enhanced.controller');
const rateLimiter = require('../middleware/rateLimiter');
const { validateCrawlRequest } = require('../middleware/validator');

// POST / - Crawl single or multiple URLs
router.post('/', rateLimiter, validateCrawlRequest, crawlController.crawlUrls);

// POST /stream - Crawl with Server-Sent Events (for real-time progress)
router.post('/stream', rateLimiter, validateCrawlRequest, enhancedController.crawlUrlsWithStreaming);

// POST /safe - Crawl with timeout protection (60s default)
router.post('/safe', rateLimiter, validateCrawlRequest, enhancedController.crawlUrlsSafe);

// GET /:jobId - Get crawl job status
router.get('/:jobId', crawlController.getJobStatus);

// GET /locations - Get all cached locations
router.get('/locations', crawlController.getLocations);

module.exports = router;
