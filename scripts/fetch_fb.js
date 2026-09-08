const axios = require('axios');
const fs = require('fs');

async function go() {
    const fbCookies = "datr=gEqXaposcKtESUNcK84h7icY; sb=gEqXatW2f3X40hSGLnSKsRe3; m_pixel_ratio=2.8125; wd=384x832; c_user=61593670575990; xs=15%3AuO_63rUubun3Ng%3A2%3A1788300248%3A-1%3A-1; fr=0F2XZHtaoRSs5oVDZ.AWe1E8O2-ZAgB0bjVcw4tPs7XVYS6Mw9YIhZhB5O_OrVVDb_Vf0.Bql0qA..AAA.0.0.Bql0vf.AWdhX2aPLqhLPFTH2tzLpgn3s3g; locale=fr_FR; pas=61593670575990%3Avi8eVPaLag";
    const targetUrl = "https://www.facebook.com/Cristiano/";
    const res = await axios({
        method: 'get',
        url: targetUrl,
        headers: {
            'Cookie': fbCookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }
    });
    fs.writeFileSync('fb_dump.html', res.data);
    console.log("Dumped to fb_dump.html. Length:", res.data.length);
}
go();
