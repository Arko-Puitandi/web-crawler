/**
 * Debug script to analyze Nutanix page structure
 */

const puppeteer = require('puppeteer');
const { chromium } = require('playwright');

async function analyzeNutanixPage() {
  console.log('🔍 Analyzing Nutanix Global Offices page...\n');
  
  // Use Playwright to capture XHR requests
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const xhrRequests = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (contentType.includes('json')) {
      try {
        const text = await response.text();
        const json = JSON.parse(text);
        xhrRequests.push({
          url,
          status: response.status(),
          size: text.length,
          data: json
        });
      } catch (e) {
        // Not valid JSON
      }
    }
  });
  
  await page.goto('https://www.nutanix.com/company/global-offices', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  await page.waitForTimeout(5000); // Wait for dynamic content
  
  const html = await page.content();
  
  console.log('📊 Page Analysis Results:');
  console.log(`  HTML Size: ${(html.length / 1024).toFixed(1)} KB`);
  console.log(`  XHR Requests Captured: ${xhrRequests.length}\n`);
  
  if (xhrRequests.length > 0) {
    console.log('🔗 XHR/API Endpoints:');
    xhrRequests.forEach((xhr, idx) => {
      console.log(`  [${idx + 1}] ${xhr.url}`);
      console.log(`      Status: ${xhr.status}, Size: ${(xhr.size / 1024).toFixed(1)} KB`);
      
      // Check if it contains location-like data
      const jsonStr = JSON.stringify(xhr.data).toLowerCase();
      const hasLocation = jsonStr.includes('location') || jsonStr.includes('office') || 
                         jsonStr.includes('address') || jsonStr.includes('latitude') ||
                         jsonStr.includes('city') || jsonStr.includes('country');
      
      if (hasLocation) {
        console.log(`      ⭐ Contains location-related data`);
        
        // Try to count items
        const countArrays = (obj, depth = 0) => {
          if (depth > 5) return [];
          const arrays = [];
          for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0) {
              arrays.push({ key, length: obj[key].length });
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              arrays.push(...countArrays(obj[key], depth + 1));
            }
          }
          return arrays;
        };
        
        const arrays = countArrays(xhr.data);
        if (arrays.length > 0) {
          console.log(`      Arrays found:`, arrays);
        }
      }
      console.log('');
    });
  }
  
  // Check HTML for location data
  const locationPatterns = [
    /<div[^>]*office/gi,
    /<div[^>]*location/gi,
    /data-office/gi,
    /data-location/gi,
    /"office":/gi,
    /"location":/gi
  ];
  
  console.log('📄 HTML Content Analysis:');
  locationPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  ${pattern.source}: ${matches.length} matches`);
    }
  });
  
  await browser.close();
  console.log('\n✅ Analysis complete');
}

analyzeNutanixPage().catch(console.error);
