require('dotenv').config();
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^['\"]|['\"]$/g, '');
}
const dbHelper = require('../helpers/db');
const Admin = require('../models/admin');
const User = require('../models/user');

async function main() {
  await dbHelper.instance();

  const admins = await Admin.find({}).lean();
  const users = await User.find({}).lean();

  console.log('Admin accounts count:', admins.length);
  if (admins.length) {
    admins.forEach(a => console.log(`- ${a.email} (role: ${a.role || 'n/a'}, id: ${a._id})`));
  }

  console.log('\nUser accounts count:', users.length);
  if (users.length) {
    users.slice(0, 100).forEach(u => console.log(`- ${u.email || '(no email)'} (role: ${u.role || 'n/a'}, id: ${u._id})`));
    if (users.length > 100) console.log(`...and ${users.length - 100} more`);
  }

  process.exit(0);
}

main().catch(e => { console.error('Error:', e && e.message ? e.message : e); process.exit(1); });
