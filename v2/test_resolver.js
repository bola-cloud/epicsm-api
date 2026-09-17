const mongoose = require('mongoose');
const TargetResolver = require('./core/TargetResolver');
const SettingsV2 = require('./models/SettingsV2');

mongoose.connect('mongodb://127.0.0.1:27017/epicsm')
    .then(async () => {
        console.log("Connected to DB.");
        const settings = await SettingsV2.findOne();
        if (!settings || !settings.facebookCookies) {
            console.error("No FB cookies found in DB!");
            process.exit(1);
        }
        
        const testUrls = [
            'https://www.facebook.com/photo?fbid=1632219801598440&set=a.280671283419972',
            'https://www.facebook.com/share/p/1CKKVKSjjm/?mibextid=wwXIfr'
        ];
        
        for (const url of testUrls) {
            console.log(`\nTesting URL: ${url}`);
            const result = await TargetResolver.resolve('facebook', url, 'like', settings.facebookCookies);
            console.log(`Result Target ID: ${result}`);
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
