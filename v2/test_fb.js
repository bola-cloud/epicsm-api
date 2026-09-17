const axios = require('axios');
const url = 'https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit';
const cookie = 'c_user=100012345;';

axios.get(url, { headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0' }})
  .then(res => {
      const fbMatch = res.data.match(/ZmVlZGJhY2s6[A-Za-z0-9_-]+/);
      if (fbMatch) {
          const decoded = Buffer.from(fbMatch[0], 'base64').toString('utf-8');
          console.log("Decoded feedback:", decoded.replace('feedback:', ''));
      } else {
          console.log("No feedback match");
      }
      const targetFbidMatch = res.data.match(/"target_fbid":"(\d+)"/);
      if (targetFbidMatch) console.log("target_fbid:", targetFbidMatch[1]);
  })
  .catch(console.error);
