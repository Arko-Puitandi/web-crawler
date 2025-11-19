const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulk.controller');

// POST /api/bulk/upload - Upload CSV and process
router.post(
  '/upload',
  bulkController.getUploadMiddleware(),
  bulkController.uploadAndProcess.bind(bulkController)
);

module.exports = router;
