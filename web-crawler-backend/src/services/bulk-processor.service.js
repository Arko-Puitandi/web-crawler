const csv = require('csv-parser');
const { Readable } = require('stream');
const ExcelJS = require('exceljs');
const crawlerService = require('./crawler.service');
const progressTracker = require('./progress-tracker.service');
const logger = require('../utils/logger');

class BulkProcessorService {
  /**
   * Process CSV file with multiple URLs
   */
  async processCsvFile(fileBuffer, options = {}) {
    const jobId = progressTracker.constructor.generateJobId();
    const urls = await this.parseCsv(fileBuffer);
    
    logger.info(`📦 Bulk processing ${urls.length} URLs from CSV`);
    
    progressTracker.createJob(jobId, {
      totalPages: urls.length,
      mode: 'bulk-csv',
      status: 'parsing'
    });

    const results = [];
    const batchSize = options.batchSize || 5;
    
    try {
      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        logger.info(`📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} URLs)`);
        
        progressTracker.updateProgress(jobId, {
          status: 'processing',
          currentPage: `Batch ${Math.floor(i / batchSize) + 1}`,
          pagesProcessed: i
        });

        // Process batch in parallel
        const batchPromises = batch.map(async (item) => {
          try {
            const locations = await crawlerService.crawlUrls([item.url], {
              crawlEntireSite: options.crawlEntireSite || false,
              maxPages: options.maxPages || 10,
              maxDepth: options.maxDepth || 2
            });

            return {
              companyName: item.companyName,
              url: item.url,
              status: 'success',
              locationsCount: locations.length,
              locations: locations
            };
          } catch (error) {
            logger.error(`Error processing ${item.url}: ${error.message}`);
            return {
              companyName: item.companyName,
              url: item.url,
              status: 'failed',
              error: error.message,
              locationsCount: 0,
              locations: []
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        progressTracker.updateProgress(jobId, {
          pagesProcessed: Math.min(i + batchSize, urls.length),
          locationsFound: results.reduce((sum, r) => sum + r.locationsCount, 0)
        });

        // Add delay between batches to be respectful
        if (i + batchSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      progressTracker.completeJob(jobId, {
        totalLocations: results.reduce((sum, r) => sum + r.locationsCount, 0),
        successCount: results.filter(r => r.status === 'success').length,
        failedCount: results.filter(r => r.status === 'failed').length
      });

      logger.info(`✅ Bulk processing complete: ${results.length} URLs processed`);
      return { jobId, results };

    } catch (error) {
      progressTracker.failJob(jobId, error);
      throw error;
    }
  }

  /**
   * Parse CSV buffer to extract URLs
   */
  async parseCsv(fileBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(fileBuffer.toString());

      stream
        .pipe(csv())
        .on('data', (row) => {
          // Support different CSV formats
          const companyName = row['Company Name'] || row['company'] || row['name'] || 'Unknown';
          const url = row['URL'] || row['url'] || row['Website'] || row['website'];
          
          if (url) {
            results.push({ companyName, url: url.trim() });
          }
        })
        .on('end', () => {
          logger.info(`📋 Parsed ${results.length} URLs from CSV`);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  /**
   * Generate Excel report from bulk results
   */
  async generateExcelReport(results) {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Company Name', key: 'companyName', width: 30 },
      { header: 'URL', key: 'url', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Locations Found', key: 'locationsCount', width: 15 },
      { header: 'Error', key: 'error', width: 40 }
    ];

    results.forEach(result => {
      const row = summarySheet.addRow({
        companyName: result.companyName,
        url: result.url,
        status: result.status,
        locationsCount: result.locationsCount,
        error: result.error || ''
      });

      // Color code by status
      if (result.status === 'success') {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCB' }
        };
      }
    });

    // Locations detail sheet
    const locationsSheet = workbook.addWorksheet('All Locations');
    locationsSheet.columns = [
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Location Name', key: 'locationName', width: 30 },
      { header: 'Address', key: 'locationAddress', width: 40 },
      { header: 'City', key: 'streetOrCity', width: 20 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postcode', key: 'postcode', width: 12 },
      { header: 'Country', key: 'countryIso3', width: 10 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Hours', key: 'hours', width: 25 },
      { header: 'Quality Score', key: 'qualityScore', width: 15 },
      { header: 'Source URL', key: 'sourceUrl', width: 40 }
    ];

    results.forEach(result => {
      if (result.locations && result.locations.length > 0) {
        result.locations.forEach(location => {
          const row = locationsSheet.addRow({
            company: result.companyName,
            locationName: location.locationName,
            locationAddress: location.locationAddress,
            streetOrCity: location.streetOrCity,
            state: location.state,
            postcode: location.postcode,
            countryIso3: location.countryIso3,
            latitude: location.latitude,
            longitude: location.longitude,
            phone: Array.isArray(location.phone) ? location.phone.join(', ') : location.phone,
            email: Array.isArray(location.email) ? location.email.join(', ') : location.email,
            hours: Array.isArray(location.hours) ? location.hours.join('; ') : location.hours,
            qualityScore: location.qualityScore ? `${Math.round(location.qualityScore)}%` : '',
            sourceUrl: location.sourceUrl
          });

          // Color code by quality
          if (location.qualityScore >= 90) {
            row.getCell('qualityScore').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF90EE90' }
            };
          } else if (location.qualityScore >= 70) {
            row.getCell('qualityScore').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF87CEEB' }
            };
          } else if (location.qualityScore >= 50) {
            row.getCell('qualityScore').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFA500' }
            };
          }
        });
      }
    });

    // Style headers
    [summarySheet, locationsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    return workbook;
  }
}

module.exports = new BulkProcessorService();
