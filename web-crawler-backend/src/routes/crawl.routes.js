const express = require('express');
const router = express.Router();
const crawlController = require('../controllers/crawl.controller');
const rateLimiter = require('../middleware/rateLimiter');
const { validateCrawlRequest } = require('../middleware/validator');

// POST / - Crawl single or multiple URLs
router.post('/', rateLimiter, validateCrawlRequest, crawlController.crawlUrls);

// GET /:jobId - Get crawl job status
router.get('/:jobId', crawlController.getJobStatus);

// GET /locations - Get all cached locations
router.get('/locations', crawlController.getLocations);

module.exports = router;
