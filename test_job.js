const mongoose = require('mongoose');
const JobV2 = require('./v2/models/JobV2');
mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin').then(async () => {
    const job = await JobV2.findOne().sort({createdAt: -1});
    console.log("Latest Job:", job);
    process.exit(0);
});
