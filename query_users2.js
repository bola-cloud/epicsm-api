const mongoose = require('mongoose');
mongoose.connect("mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin");
const User = mongoose.model('User2', new mongoose.Schema({}, { strict: false, collection: 'users' }));
async function run() {
  const users = await User.find({}).limit(3);
  console.log("Users:", users);
  
  const userByUid = await User.findOne({ uid: "mejcpkcvJtfOuN4i1gjP5vEg5zz2" });
  console.log("Found by uid in DB:", userByUid);
  
  process.exit();
}
run();
