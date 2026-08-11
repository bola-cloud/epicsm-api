require('dotenv').config();
// Normalize DATABASE_URL if wrapped in quotes
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^['\"]|['\"]$/g, '');
}
const dbHelper = require('../helpers/db');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

async function main() {
  // Connect to DB and get an admin
  await dbHelper.instance();
  const admin = await Admin.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin user found');
    process.exit(1);
  }

  const payload = { _id: admin._id, role: admin.role, tokenVersion: admin.tokenVersion || 0 };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1d' });

  console.log('Authorization header to use:');
  console.log('Authorization: JWT ' + token);
  console.log('\nNow reading /check-update response (from apk-metadata.json):');

  const apkMetadataPath = path.join(__dirname, '../apk-metadata.json');
  if (!fs.existsSync(apkMetadataPath)) {
    console.log('No APK metadata found.');
    process.exit(0);
  }
  const metadata = JSON.parse(fs.readFileSync(apkMetadataPath));
  const latest = metadata[metadata.length - 1];
  console.log(JSON.stringify(latest, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e && e.message ? e.message : e);
  process.exit(1);
});
