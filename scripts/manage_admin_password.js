require('dotenv').config();
// Normalize DATABASE_URL if it is wrapped in quotes in .env
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, '');
}
const dbHelper = require('../helpers/db');
const mongoose = require('mongoose');
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');

async function listAdmins() {
  await dbHelper.instance();
  const admins = await Admin.find({}).lean();
  if (!admins || admins.length === 0) {
    console.log('No admin users found in the database.');
    process.exit(0);
  }
  console.log('Found admin users:');
  admins.forEach((a) => {
    console.log(`- ${a.email} (role: ${a.role || 'n/a'}, id: ${a._id})`);
  });
  process.exit(0);
}

async function setPassword(email, newPassword) {
  if (!email || !newPassword) {
    console.error('Usage: node manage_admin_password.js set <email> <newPassword>');
    process.exit(1);
  }

  await dbHelper.instance();

  const user = await Admin.findOne({ email: email });
  if (!user) {
    console.error(`No admin user found with email: ${email}`);
    process.exit(1);
  }

  const salt = await bcrypt.genSalt();
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
  console.log(`Password updated for ${email}`);
  process.exit(0);
}

async function revokeUser(email) {
  if (!email) {
    console.error('Usage: node manage_admin_password.js revoke <email>');
    process.exit(1);
  }

  await dbHelper.instance();
  const user = await Admin.findOne({ email: email });
  if (!user) {
    console.error(`No admin user found with email: ${email}`);
    process.exit(1);
  }
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  console.log(`Revoked tokens for ${email} (tokenVersion=${user.tokenVersion})`);
  process.exit(0);
}

async function revokeAll() {
  await dbHelper.instance();
  const res = await Admin.updateMany({}, { $inc: { tokenVersion: 1 } });
  console.log(`Revoked tokens for all admins. Matched: ${res.matchedCount || res.n} Updated: ${res.modifiedCount || res.nModified}`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    await listAdmins();
    return;
  }

  const cmd = args[0];
  if (cmd === 'set') {
    const email = args[1];
    const newPassword = args[2];
    await setPassword(email, newPassword);
  } else if (cmd === 'revoke') {
    const email = args[1];
    await revokeUser(email);
  } else if (cmd === 'revokeAll') {
    await revokeAll();
  } else {
    console.error('Unknown command. Use no args to list, or `set <email> <password>` to change.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error:', e && e.message ? e.message : e);
  process.exit(1);
});
