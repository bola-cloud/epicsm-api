const mongoose = require('mongoose');
const JobActionV2 = require('./models/JobActionV2');

mongoose.connect('mongodb://127.0.0.1:27017/epicsm')
    .then(async () => {
        const res = await JobActionV2.deleteMany({});
        console.log("Deleted actions:", res.deletedCount);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
