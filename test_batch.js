const mongoose = require('mongoose');
const BatchWriter = require('./v2/core/BatchWriter');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        BatchWriter.addActionSuccess('Uo50ZWyjMyCiAEKyqz515kPu', 'mejcpkcvJtfOuN4i1gjP5vEg5zz2');
        console.log("Added to BatchWriter, waiting 4 seconds...");
        setTimeout(() => {
            console.log("Exiting test.");
            process.exit(0);
        }, 4000);
    });
