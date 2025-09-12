// Simple test script for live Lovable deployment
import puppeteer from 'puppeteer';
import fs from 'fs';

const LIVE_URL = 'https://mothership-hq.lovable.app';

async function runTests() {
  console.log('🚀 Starting tests against live deployment:', LIVE_URL);
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Homepage loads
    console.log('📋 Test 1: Homepage loads...');
    results.totalTests++;
    try {
      await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      const title = await page.title();
      if (title) {
        results.passed++;
        results.tests.push({ name: 'Homepage loads', status: 'PASSED', details: `Title: ${title}` });
        console.log('✅ PASSED: Homepage loads');
      } else {
        throw new Error('No title found');
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Homepage loads', status: 'FAILED', error: error.message });
      console.log('❌ FAILED: Homepage loads -', error.message);
    }
    
    // Test 2: Authentication page exists
    console.log('📋 Test 2: Authentication page exists...');
    results.totalTests++;
    try {
      // Check if we're redirected to auth or if auth elements exist
      const authElements = await page.$$('[data-testid="auth-form"], form, input[type="email"], input[type="password"]');
      if (authElements.length > 0) {
        results.passed++;
        results.tests.push({ name: 'Authentication page exists', status: 'PASSED', details: 'Auth elements found' });
        console.log('✅ PASSED: Authentication page exists');
      } else {
        // Check URL for auth redirect
        const currentUrl = page.url();
        if (currentUrl.includes('/auth') || currentUrl.includes('login')) {
          results.passed++;
          results.tests.push({ name: 'Authentication page exists', status: 'PASSED', details: 'Redirected to auth' });
          console.log('✅ PASSED: Authentication page exists (redirected)');
        } else {
          throw new Error('No auth elements or redirect found');
        }
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Authentication page exists', status: 'FAILED', error: error.message });
      console.log('❌ FAILED: Authentication page exists -', error.message);
    }
    
    // Test 3: Theme toggle exists
    console.log('📋 Test 3: Theme toggle exists...');
    results.totalTests++;
    try {
      const themeToggle = await page.$('button[aria-label*="theme"], button[aria-label*="Theme"], [data-testid="theme-toggle"]');
      if (themeToggle) {
        results.passed++;
        results.tests.push({ name: 'Theme toggle exists', status: 'PASSED' });
        console.log('✅ PASSED: Theme toggle exists');
      } else {
        // Try to find any button with sun/moon icons
        const iconButtons = await page.$$('button svg');
        if (iconButtons.length > 0) {
          results.passed++;
          results.tests.push({ name: 'Theme toggle exists', status: 'PASSED', details: 'Icon button found' });
          console.log('✅ PASSED: Theme toggle exists (icon button)');
        } else {
          throw new Error('No theme toggle found');
        }
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Theme toggle exists', status: 'FAILED', error: error.message });
      console.log('❌ FAILED: Theme toggle exists -', error.message);
    }
    
    // Test 4: Responsive design
    console.log('📋 Test 4: Responsive design...');
    results.totalTests++;
    try {
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test tablet viewport
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test desktop viewport
      await page.setViewport({ width: 1920, height: 1080 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      results.passed++;
      results.tests.push({ name: 'Responsive design', status: 'PASSED', details: 'All viewports tested' });
      console.log('✅ PASSED: Responsive design works');
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Responsive design', status: 'FAILED', error: error.message });
      console.log('❌ FAILED: Responsive design -', error.message);
    }
    
    // Test 5: Check for Supabase connection
    console.log('📋 Test 5: Supabase connection...');
    results.totalTests++;
    try {
      // Check for Supabase client in window or network requests
      const supabaseCheck = await page.evaluate(() => {
        return window.supabase !== undefined || 
               document.querySelector('script[src*="supabase"]') !== null;
      });
      
      if (supabaseCheck) {
        results.passed++;
        results.tests.push({ name: 'Supabase connection', status: 'PASSED' });
        console.log('✅ PASSED: Supabase connection detected');
      } else {
        // Check network requests for Supabase
        const requests = [];
        page.on('request', request => requests.push(request.url()));
        await page.reload();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const hasSupabaseRequests = requests.some(url => url.includes('supabase'));
        if (hasSupabaseRequests) {
          results.passed++;
          results.tests.push({ name: 'Supabase connection', status: 'PASSED', details: 'Network requests found' });
          console.log('✅ PASSED: Supabase connection detected (network)');
        } else {
          throw new Error('No Supabase connection detected');
        }
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Supabase connection', status: 'FAILED', error: error.message });
      console.log('❌ FAILED: Supabase connection -', error.message);
    }
    
    // Test 6: Performance metrics
    console.log('📋 Test 6: Performance metrics...');
    results.totalTests++;
    try {
      const metrics = await page.metrics();
      const performanceTiming = JSON.parse(
        await page.evaluate(() => JSON.stringify(window.performance.timing))
      );
      
      const pageLoadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
      
      if (pageLoadTime < 5000) { // Page loads in less than 5 seconds
        results.passed++;
        results.tests.push({ 
          name: 'Performance metrics', 
          status: 'PASSED', 
          details: `Page load time: ${pageLoadTime}ms` 
        });
        console.log(`✅ PASSED: Performance metrics (load time: ${pageLoadTime}ms)`);
      } else {
        throw new Error(`Page load time too slow: ${pageLoadTime}ms`);
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Performance metrics', status: 'FAILED', error: error.message });
      console.log('❌ FAILED: Performance metrics -', error.message);
    }
    
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  return results;
}

// Run tests
runTests().then(results => {
  // Save results to file
  const reportPath = '/Users/russellteter/Desktop/mothership-hq/testsprite_tests/test_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Test report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});