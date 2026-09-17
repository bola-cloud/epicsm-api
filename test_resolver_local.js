const mongoose = require('mongoose');
const TargetResolver = require('./v2/core/TargetResolver');

async function test() {
    await mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin');
    
    const AdminCookie = mongoose.models.AdminCookie || mongoose.model('AdminCookie', new mongoose.Schema({}, { strict: false }), 'admincookies');
    const doc = await AdminCookie.findOne({ platform: 'facebook' });
    const cookies = doc ? doc.cookieString : '';
    console.log('Using cookies:', cookies);
    
    // Testing the photo link that previously failed
    const url = 'https://m.facebook.com/photo.php?fbid=1615690693258526';
    console.log('Resolving URL:', url);
    
    try {
        const result = await TargetResolver.resolve('facebook', url, 'like', cookies);
        console.log('Result:', result);
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    process.exit(0);
}

test();
