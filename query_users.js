const mongoose = require('mongoose');
mongoose.connect("mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin");
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
async function run() {
  const user = await User.findOne({ _id: "mejcpkcvJtfOuN4i1gjP5vEg5zz2" });
  console.log("Found by _id:", user);
  const userByUid = await User.findOne({ uid: "mejcpkcvJtfOuN4i1gjP5vEg5zz2" });
  console.log("Found by uid:", userByUid);
  
  const anyUser = await User.findOne({});
  console.log("Any user _id type:", typeof anyUser._id, "value:", anyUser._id);
  process.exit();
}
run();
