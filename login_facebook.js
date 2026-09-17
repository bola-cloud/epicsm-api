const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node login_facebook.js <email> <password>");
    process.exit(1);
}

const email = args[0];
const password = args[1];

async function run() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin');
    console.log('Connected to MongoDB.');

    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
        console.log('Navigating to m.facebook.com...');
        await page.goto('https://m.facebook.com/', { waitUntil: 'networkidle2' });
        
        console.log('Entering credentials...');
        await page.type('input[name="email"]', email, { delay: 50 });
        await page.type('input[name="pass"]', password, { delay: 50 });
        
        console.log('Pressing Enter...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.keyboard.press('Enter')
        ]);
        
        console.log('Current URL after login:', page.url());
        await page.screenshot({ path: 'login_result.png' });
        
        if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
            console.log('WARNING: Facebook is asking for 2FA or verification (checkpoint).');
            console.log('Check login_result.png for more details.');
            await browser.close();
            process.exit(1);
        }
        
        console.log('Extracting cookies...');
        const cookies = await page.cookies();
        let cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        console.log('Cookie String Generated. Saving to DB...');
        const AdminCookie = mongoose.models.AdminCookie || mongoose.model('AdminCookie', new mongoose.Schema({}, { strict: false }), 'admincookies');
        
        await AdminCookie.updateOne(
            { platform: 'facebook' },
            { $set: { cookieString: cookieString, platform: 'facebook' } },
            { upsert: true }
        );
        
        console.log('✅ Successfully logged in and saved cookies to database!');
        
    } catch (error) {
        console.error('Error during login:', error);
        await page.screenshot({ path: 'login_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
}

run();
