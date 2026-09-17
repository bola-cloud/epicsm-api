const puppeteer = require('puppeteer');
const fs = require('fs');
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

async function run() {
    fs.writeFileSync('code.txt', ''); // Clear the code file
    fs.writeFileSync('login_status.txt', 'starting'); // Status

    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 8000)); // wait 8 seconds for page load
        
        await page.screenshot({ path: 'interactive_step1.png' });
        
        if (page.url().includes('checkpoint') || page.url().includes('two_step_verification') || page.url().includes('challenge')) {
            console.log('⚠️ 2FA Required! Please check interactive_step1.png');
            fs.writeFileSync('login_status.txt', 'need_code');
            
            // Wait for user to provide code in code.txt or approve on phone
            console.log('Waiting for approval or code in code.txt (timeout 120s)...');
            let code = '';
            for (let i = 0; i < 120; i++) {
                await new Promise(r => setTimeout(r, 1000)); // wait 1 sec
                
                // If URL changed to a normal FB page, user approved on phone!
                if (!page.url().includes('checkpoint') && !page.url().includes('two_step_verification') && !page.url().includes('challenge') && page.url().includes('home')) {
                    console.log('User approved on phone!');
                    break; 
                }
                
                // Check if user provided code in file
                const fileContent = fs.readFileSync('code.txt', 'utf8').trim();
                if (fileContent.length >= 6) {
                    code = fileContent;
                    console.log(`Code found: ${code}`);
                    
                    // Type the code
                    // the input ID varies: sometimes it's `approvals_code`, sometimes `input[type="number"]`
                    try {
                        const inputs = await page.$$('input[type="text"], input[type="number"]');
                        if (inputs.length > 0) {
                            await inputs[0].type(code);
                            await page.keyboard.press('Enter');
                            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                        }
                    } catch (e) {
                        console.log('Error typing code:', e);
                    }
                    break;
                }
            }
        }
        
        // Final screenshot
        await page.screenshot({ path: 'interactive_final.png' });
        console.log('Final URL:', page.url());
        
        console.log('Connecting to DB and saving cookies...');
        await mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin');
        
        const cookies = await page.cookies();
        let cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        const AdminCookie = mongoose.models.AdminCookie || mongoose.model('AdminCookie', new mongoose.Schema({}, { strict: false }), 'admincookies');
        
        await AdminCookie.updateOne(
            { platform: 'facebook' },
            { $set: { cookieString: cookieString, platform: 'facebook' } },
            { upsert: true }
        );
        
        console.log('✅ Cookies saved!');
        fs.writeFileSync('login_status.txt', 'success');

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('login_status.txt', 'error');
    } finally {
        await browser.close();
        process.exit(0);
    }
}

run();
