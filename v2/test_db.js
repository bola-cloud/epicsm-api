const mongoose = require('mongoose');
const JobActionV2 = require('./models/JobActionV2');

mongoose.connect('mongodb://127.0.0.1:27017/epicsm')
    .then(async () => {
        const count = await JobActionV2.countDocuments({ targetLink: { $regex: '1632430244910729' } });
        console.log("Existing actions for link:", count);
        process.exit(0);
    });
