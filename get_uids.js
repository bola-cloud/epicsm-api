const mongoose = require('mongoose');
mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin').then(async () => {
  const users = await mongoose.connection.db.collection('users').find({uid: {$exists: true}}).limit(10).toArray();
  console.log("Users encoded:", users.map(u => encodeURIComponent(u.uid)));
  process.exit(0);
});
