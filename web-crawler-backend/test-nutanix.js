/**
 * Test script to crawl Nutanix global offices page
 * Expected: 57 offices
 */

const crawlerService = require('./src/services/crawler.service');
const logger = require('./src/utils/logger');

async function testNutanix() {
  const url = 'https://www.nutanix.com/company/global-offices';
  
  logger.info('🧪 Testing Nutanix Global Offices Extraction');
  logger.info(`📍 Expected: 57 offices`);
  logger.info(`🔗 URL: ${url}`);
  logger.info('='.repeat(80));
  
  try {
    const locations = await crawlerService.crawlUrls([url]);
    
    logger.info('='.repeat(80));
    logger.info(`✅ Extraction Complete`);
    logger.info(`📊 Total Locations: ${locations.length}`);
    logger.info(`🎯 Target: 57 offices`);
    logger.info(`📈 Success Rate: ${((locations.length / 57) * 100).toFixed(1)}%`);
    
    if (locations.length < 57) {
      logger.warn(`⚠️  Missing ${57 - locations.length} offices!`);
    }
    
    // Group by extraction method
    const byMethod = {};
    locations.forEach(loc => {
      const method = loc.extractionMethod || 'unknown';
      byMethod[method] = (byMethod[method] || 0) + 1;
    });
    
    logger.info('\n📋 Breakdown by Extraction Method:');
    Object.entries(byMethod).forEach(([method, count]) => {
      logger.info(`  ${method}: ${count} locations`);
    });
    
    // Show sample locations
    logger.info('\n📍 Sample Locations:');
    locations.slice(0, 5).forEach((loc, idx) => {
      logger.info(`  [${idx + 1}] ${loc.name || 'Unnamed'} - ${loc.city}, ${loc.country}`);
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testNutanix();
