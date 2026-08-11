require('dotenv').config();
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^['\"]|['\"]$/g, '');
}
const mongoose = require('mongoose');

async function main() {
  try {
    console.log('Connecting to', process.env.DATABASE_URL);
    await mongoose.connect(process.env.DATABASE_URL, { dbName: undefined });
    const db = mongoose.connection.db;
    const admin = db.admin();

    // Try to list all users across all DBs
    const result = await admin.command({ usersInfo: { forAllDBs: true } });

    if (!result || !result.users) {
      console.log('No user information returned');
      process.exit(0);
    }

    console.log('MongoDB users (server-level):');
    result.users.forEach(u => {
      console.log(`- user: ${u.user}  db: ${u.db}  roles: ${JSON.stringify(u.roles)}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('Error listing mongo users:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
