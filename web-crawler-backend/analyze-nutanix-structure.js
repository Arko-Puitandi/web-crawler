/**
 * Nutanix-specific extractor
 * Analyzes the exact HTML structure to extract all 57 offices
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function analyzeNutanixStructure() {
  console.log('🔍 Analyzing Nutanix HTML structure...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://www.nutanix.com/company/global-offices', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  const html = await page.content();
  await browser.close();
  
  const $ = cheerio.load(html);
  
  // Find the exact pattern
  console.log('📊 Analyzing header structure:\n');
  
  let h3Count = 0;
  const h3Headers = [];
  
  $('h3').each((i, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length < 100) {
      h3Count++;
      h3Headers.push({
        index: i,
        text: text,
        class: $(elem).attr('class'),
        nextElementTag: $(elem).next()[0]?.name,
        nextElementText: $(elem).next().text().trim().substring(0, 50)
      });
    }
  });
  
  console.log(`Total h3 headers: ${h3Count}\n`);
  
  // Group by pattern
  const allCaps = h3Headers.filter(h => h.text === h.text.toUpperCase() && h.text.length > 2);
  const titleCase = h3Headers.filter(h => h.text !== h.text.toUpperCase() && h.text.match(/^[A-Z]/));
  
  console.log(`All CAPS headers (likely countries): ${allCaps.length}`);
  allCaps.slice(0, 10).forEach(h => console.log(`  - ${h.text}`));
  
  console.log(`\nTitle Case headers (likely cities): ${titleCase.length}`);
  titleCase.slice(0, 10).forEach(h => console.log(`  - ${h.text}`));
  
  // Find the container
  console.log('\n📦 Looking for main container...');
  const mainContainer = $('main, .main-content, [role="main"], .content');
  console.log(`Main container found: ${mainContainer.length > 0}`);
  
  // Check for specific classes
  console.log('\n🎨 Checking for specific CSS patterns...');
  const officeContainers = $('[class*="office"], [class*="location"], [id*="office"], [id*="location"]');
  console.log(`Elements with office/location classes: ${officeContainers.length}`);
  
  // Show structure sample
  console.log('\n📝 Sample structure (first 5 h3 + content):');
  $('h3').slice(0, 5).each((i, elem) => {
    const $h3 = $(elem);
    const headerText = $h3.text().trim();
    const $next = $h3.next();
    console.log(`\n[${i+1}] h3: "${headerText}"`);
    console.log(`    Next element: <${$next[0]?.name}>`);
    console.log(`    Next text: "${$next.text().trim().substring(0, 80)}..."`);
  });
  
  console.log('\n✅ Analysis complete');
}

analyzeNutanixStructure().catch(console.error);
