require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../utils/epicsm-app-firebase-adminsdk-a6csy-58907dbb09.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
    });
}
const db = admin.firestore();

// Connect to MongoDB
const User = require('../models/user');
const UserSyncService = require('../v2/services/userSyncService');

async function runMigration() {
    console.log('====================================================');
    console.log('🚀 Starting Firebase to MongoDB Migration Runner');
    console.log('====================================================');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB successfully.');

    // Count Firestore users
    console.log('Counting users in Firestore...');
    const firestoreCountSnap = await db.collection('users').count().get();
    const totalFirestoreUsers = firestoreCountSnap.data().count;
    console.log(`📊 Total users in Firestore: ${totalFirestoreUsers}`);

    const initialMongoCount = await User.countDocuments();
    console.log(`📊 Current users in MongoDB: ${initialMongoCount}`);

    // Check if we should resume from the last migrated user
    const shouldResume = process.argv.includes('--resume') || initialMongoCount > 1000;
    let lastDocId = null;

    if (shouldResume) {
        const lastMigrated = await User.find({ migratedToV2: true }).sort({ uid: -1 }).limit(1);
        if (lastMigrated.length > 0 && lastMigrated[0].uid) {
            lastDocId = lastMigrated[0].uid;
            console.log(`⏩ Auto-Resume detected! Starting after last migrated UID: ${lastDocId} (${lastMigrated[0].email})`);
        }
    }

    const BATCH_SIZE = 1000;
    let totalProcessed = 0;
    let totalUpserted = 0;
    let totalModified = 0;
    let totalErrors = 0;
    let hasMore = true;
    let batchNumber = 0;

    const startTime = Date.now();

    while (hasMore) {
        batchNumber++;
        let query = db.collection('users')
            .orderBy(admin.firestore.FieldPath.documentId())
            .limit(BATCH_SIZE);

        if (lastDocId) {
            query = query.startAfter(lastDocId);
        }

        let snapshot;
        try {
            snapshot = await query.get();
        } catch (readErr) {
            console.error(`❌ Firestore read error at batch ${batchNumber}:`, readErr.message);
            if (readErr.message.includes('Quota exceeded') || readErr.code === 8) {
                console.error('\n⚠️ Firebase Daily Read Quota Exceeded (Spark Plan: 50,000 reads/day).');
                console.error('💡 To finish immediately, upgrade Firebase to Blaze plan (pay-as-you-go, cost < $0.05).');
                console.error('💡 Or wait until the quota resets tomorrow and rerun with: node scripts/migrate-firebase-to-mongo.js --resume\n');
            }
            break;
        }

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        const seenEmailsInBatch = new Set();
        const bulkOps = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const mapped = UserSyncService.mapUserData(doc.id, data);

            // Handle potential email collisions within batch
            if (seenEmailsInBatch.has(mapped.email)) {
                mapped.email = `${mapped.uid}@temporary.com`;
            }
            seenEmailsInBatch.add(mapped.email);

            bulkOps.push({
                updateOne: {
                    filter: { uid: mapped.uid },
                    update: {
                        $set: {
                            uid: mapped.uid,
                            email: mapped.email,
                            name: mapped.name,
                            nameNormalized: mapped.nameNormalized,
                            nom: mapped.nom,
                            prenom: mapped.prenom,
                            photo: mapped.photo,
                            fcm: mapped.fcm,
                            provider: mapped.provider,
                            coins: mapped.coins,
                            dollars: mapped.dollars,
                            dailyRewards: mapped.dailyRewards,
                            banned: mapped.banned,
                            isVip: mapped.isVip,
                            migratedToV2: true,
                            created: mapped.created,
                            lastSignIn: mapped.lastSignIn
                        },
                        $setOnInsert: {
                            role: data.role || 'client',
                            facebookCookies: '',
                            instagramCookies: ''
                        }
                    },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            try {
                const result = await User.bulkWrite(bulkOps, { ordered: false });
                totalUpserted += (result.upsertedCount || 0);
                totalModified += (result.modifiedCount || 0);
            } catch (err) {
                if (err.result) {
                    totalUpserted += (err.result.nUpserted || err.result.upsertedCount || 0);
                    totalModified += (err.result.nModified || err.result.modifiedCount || 0);
                    totalErrors += (err.writeErrors ? err.writeErrors.length : 1);
                } else {
                    console.error(`[Batch ${batchNumber}] Error during bulkWrite:`, err.message);
                    totalErrors += bulkOps.length;
                }
            }
        }

        totalProcessed += snapshot.docs.length;
        lastDocId = snapshot.docs[snapshot.docs.length - 1].id;

        const currentMongoTotal = initialMongoCount + totalUpserted;
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        const percent = ((currentMongoTotal / totalFirestoreUsers) * 100).toFixed(1);
        const rate = (totalProcessed / (elapsedSec || 1)).toFixed(0);

        console.log(`[Batch ${batchNumber}] Processed this run: ${totalProcessed} | Total in DB: ${currentMongoTotal}/${totalFirestoreUsers} (${percent}%) | Inserted: ${totalUpserted} | Errors: ${totalErrors} | Speed: ${rate} users/sec | Elapsed: ${elapsedSec}s`);

        if (snapshot.docs.length < BATCH_SIZE) {
            hasMore = false;
        }
    }

    const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const finalMongoCount = await User.countDocuments();

    console.log('====================================================');
    console.log('📊 Migration Status Summary');
    console.log('====================================================');
    console.log(`⏱️ Duration: ${totalTimeSec} seconds`);
    console.log(`👥 Processed in this run: ${totalProcessed}`);
    console.log(`➕ Inserted: ${totalUpserted}`);
    console.log(`🔄 Updated/Modified: ${totalModified}`);
    console.log(`⚠️ Errors: ${totalErrors}`);
    console.log(`📈 Current Total in MongoDB: ${finalMongoCount} / ${totalFirestoreUsers}`);

    const report = {
        timestamp: new Date().toISOString(),
        totalFirestoreUsers,
        initialMongoCount,
        finalMongoCount,
        totalProcessedThisRun: totalProcessed,
        totalUpsertedThisRun: totalUpserted,
        totalModifiedThisRun: totalModified,
        totalErrors,
        durationSeconds: totalTimeSec
    };

    fs.writeFileSync(path.resolve(__dirname, '../migration_report.json'), JSON.stringify(report, null, 2));
    console.log('📄 Report saved to migration_report.json');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('❌ Fatal Migration Error:', err);
    process.exit(1);
});
