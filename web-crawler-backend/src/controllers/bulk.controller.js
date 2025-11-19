const bulkProcessorService = require('../services/bulk-processor.service');
const logger = require('../utils/logger');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

class BulkController {
  /**
   * Upload and process CSV file
   */
  async uploadAndProcess(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      logger.info(`📦 Bulk upload received: ${req.file.originalname} (${req.file.size} bytes)`);

      const options = {
        crawlEntireSite: req.body.crawlEntireSite === 'true',
        maxPages: parseInt(req.body.maxPages) || 10,
        maxDepth: parseInt(req.body.maxDepth) || 2,
        batchSize: parseInt(req.body.batchSize) || 5
      };

      // Start processing (async)
      const { jobId, results } = await bulkProcessorService.processCsvFile(
        req.file.buffer,
        options
      );

      // Generate Excel report
      const workbook = await bulkProcessorService.generateExcelReport(results);
      
      // Set response headers for Excel download
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=bulk-crawl-results-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();

      logger.info(`✅ Bulk processing complete, Excel report sent`);

    } catch (error) {
      logger.error('❌ Bulk processing error:', error.message);
      next(error);
    }
  }

  /**
   * Get upload middleware
   */
  getUploadMiddleware() {
    return upload.single('file');
  }
}

module.exports = new BulkController();
