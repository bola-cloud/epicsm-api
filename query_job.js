const mongoose = require('mongoose');
const JobV2 = require('./v2/models/JobV2');
mongoose.connect('mongodb://localhost:27017/epicsm').then(async () => {
  const job = await JobV2.findById('6aa05bd0473be8815062dc17');
  console.log(job);
  process.exit(0);
});
