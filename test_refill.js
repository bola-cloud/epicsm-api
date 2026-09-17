const mongoose = require('mongoose');
const JobV2 = require('./v2/models/JobV2');
mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin').then(async () => {
    const jobs = await JobV2.find({ status: 'Active', isVip: true, $expr: { $lt: ["$likeCount", "$maxCount"] } });
    console.log("Next refill attempts for 9 VIP jobs:");
    jobs.forEach(j => console.log(`${j.jobId} - attempt ${j.refillAttempts} - next: ${j.nextRefillAttempt}`));
    process.exit(0);
});
