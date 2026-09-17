const fs = require('fs');
const mongoose = require('mongoose');
const TargetResolver = require('./v2/core/TargetResolver');

const MONGODB_URI = 'mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin';

async function run() {
    let output = "=== TargetResolver Test Results ===\n\n";

    let fileContent = fs.readFileSync('mobile_files/Untitled-1.java', 'utf8');
    
    // We will extract link, linkTypeName, target_id, userPk, mediaId manually line by line
    // to correctly capture commented and uncommented blocks.
    
    const links = [];
    const blocks = fileContent.split(/\{/);
    
    for (let block of blocks) {
        if (!block.includes('"link"')) continue;
        
        const linkMatch = block.match(/"link"\s*:\s*"([^"]+)"/);
        const typeMatch = block.match(/"linkTypeName"\s*:\s*"([^"]+)"/);
        
        if (!linkMatch || !typeMatch) continue;
        
        let expected = null;
        const targetIdMatch = block.match(/"target_id"\s*:\s*"([^"]+)"/);
        if (targetIdMatch) {
            expected = targetIdMatch[1];
        } else {
            const userPkMatch = block.match(/"userPk"\s*:\s*"([^"]+)"/);
            const mediaIdMatch = block.match(/"mediaId"\s*:\s*"([^"]+)"/);
            if (userPkMatch && userPkMatch[1] !== "null") {
                expected = userPkMatch[1];
            } else if (mediaIdMatch && mediaIdMatch[1] !== "null") {
                expected = mediaIdMatch[1];
            }
        }
        
        links.push({ 
            link: linkMatch[1], 
            linkTypeName: typeMatch[1], 
            expected: expected 
        });
    }

    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        
        const fbCookieDoc = await db.collection('admincookies').findOne({ platform: 'facebook' });
        const fbCookie = fbCookieDoc ? fbCookieDoc.cookieString : '';
        
        const igCookieDoc = await db.collection('admincookies').findOne({ platform: 'instagram' });
        const igCookie = igCookieDoc ? igCookieDoc.cookieString : '';
        
        for (let i = 0; i < links.length; i++) {
            const order = links[i];
            output += `Testing Link ${i+1}/${links.length}:\n`;
            output += `URL: ${order.link}\n`;
            output += `Type: ${order.linkTypeName}\n`;
            
            let platform = order.link.includes('instagram.com') ? 'instagram' : 'facebook';
            let actionType = 'like';
            if (order.linkTypeName.toLowerCase().includes('follow') || 
                order.linkTypeName.toLowerCase().includes('addfriend') || 
                order.linkTypeName.toLowerCase().includes('joingroup')) {
                actionType = 'follow';
            }
            
            let cookie = platform === 'facebook' ? fbCookie : igCookie;
            
            output += `Expected ID: ${order.expected || 'None (Missing in file)'}\n`;
            
            const result = await TargetResolver.resolve(platform, order.link, actionType, cookie);
            
            output += `Extracted ID: ${result}\n`;
            output += `Status: ${result === order.expected ? '✅ MATCH' : '❌ MISMATCH'}\n`;
            output += `--------------------------------------------------\n`;
            
            if (i < links.length - 1) {
                console.log(`Waiting 5 seconds before next link to avoid rate limit...`);
                await new Promise(r => setTimeout(r, 5000));
            }
        }
        
        fs.writeFileSync('target_test_results.txt', output);
        console.log("Finished writing to target_test_results.txt");
        
    } catch (e) {
        console.error("Error running test:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
