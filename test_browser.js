const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testBrowser() {
    console.log('[Puppeteer Test] Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800'
        ]
    });
    
    console.log('[Puppeteer Test] Browser launched. Creating new page...');
    const page = await browser.newPage();
    
    // Set a realistic User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
        console.log('[Puppeteer Test] Navigating to m.facebook.com...');
        await page.goto('https://m.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('[Puppeteer Test] Page loaded. Taking screenshot...');
        const screenshotPath = path.join(__dirname, 'fb_login_test.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`[Puppeteer Test] Screenshot saved to ${screenshotPath}`);
        
        // Log basic info
        const title = await page.title();
        console.log(`[Puppeteer Test] Page Title: ${title}`);
        
    } catch (error) {
        console.error('[Puppeteer Test] Error during execution:', error);
    } finally {
        console.log('[Puppeteer Test] Closing browser...');
        await browser.close();
        console.log('[Puppeteer Test] Done.');
    }
}

testBrowser();
