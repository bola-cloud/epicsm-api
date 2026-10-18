const admin = require('firebase-admin');
const User = require('../../models/user');

class UserSyncService {
    static getFirestoreDb() {
        try {
            if (!admin.apps.length) {
                const serviceAccount = require('../../utils/epicsm-app-firebase-adminsdk-a6csy-58907dbb09.json');
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            return admin.firestore();
        } catch (e) {
            console.error('[UserSyncService] Firebase Admin init error:', e.message);
            return null;
        }
    }

    /**
     * Map Firestore user document data into MongoDB User model format
     */
    static mapUserData(docId, data) {
        let email = data.email ? String(data.email).toLowerCase().trim() : '';
        if (!email || email === 'null' || email === 'undefined') {
            email = `${docId}@temporary.com`;
        }
        const name = data.name || (data.nom && data.prenom ? `${data.prenom} ${data.nom}` : (data.prenom || data.nom || ''));
        const nameNormalized = data.nameNormalized || (name ? name.replace(/\s+/g, '').toLowerCase() : '');
        
        let created = new Date();
        if (data.created) {
            if (data.created.toDate && typeof data.created.toDate === 'function') {
                created = data.created.toDate();
            } else if (data.created._seconds) {
                created = new Date(data.created._seconds * 1000);
            } else {
                created = new Date(data.created);
            }
        }

        let lastSignIn = new Date();
        if (data.lastSignIn) {
            if (data.lastSignIn.toDate && typeof data.lastSignIn.toDate === 'function') {
                lastSignIn = data.lastSignIn.toDate();
            } else if (data.lastSignIn._seconds) {
                lastSignIn = new Date(data.lastSignIn._seconds * 1000);
            } else {
                lastSignIn = new Date(data.lastSignIn);
            }
        }

        const rawCoins = (data.coins !== undefined && data.coins !== null) ? Number(data.coins) : Number(data.dollars || 0);
        const rawDollars = (data.dollars !== undefined && data.dollars !== null) ? Number(data.dollars) : 0;
        const dailyRewards = Number(data.dailyRewards || 50);

        return {
            uid: docId,
            email: email,
            nom: data.nom || '',
            prenom: data.prenom || '',
            name: name,
            nameNormalized: nameNormalized,
            photo: data.photo || data.photoUrl || '',
            fcm: data.fcm || '',
            provider: data.provider || 'Google',
            coins: isNaN(rawCoins) ? 0 : rawCoins,
            dollars: isNaN(rawDollars) ? 0 : rawDollars,
            dailyRewards: isNaN(dailyRewards) ? 50 : dailyRewards,
            banned: Boolean(data.banned || false),
            isVip: Boolean(data.isVip || false),
            migratedToV2: true,
            created: isNaN(created.getTime()) ? new Date() : created,
            lastSignIn: isNaN(lastSignIn.getTime()) ? new Date() : lastSignIn
        };
    }

    /**
     * Sync a single user on-demand from Firestore into MongoDB (Lazy Sync)
     */
    static async syncSingleUser(uid) {
        if (!uid) return null;
        const db = this.getFirestoreDb();
        if (!db) {
            return await User.findOne({ uid });
        }

        try {
            const doc = await db.collection('users').doc(uid).get();
            if (!doc.exists) {
                return await User.findOne({ uid });
            }

            const mapped = this.mapUserData(doc.id, doc.data());
            
            // Upsert into MongoDB without overwriting cookies or role
            const user = await User.findOneAndUpdate(
                { uid: mapped.uid },
                { 
                    $set: mapped,
                    $setOnInsert: {
                        role: doc.data().role || 'client',
                        facebookCookies: '',
                        instagramCookies: ''
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return user;
        } catch (error) {
            console.error(`[UserSyncService] Error syncing user ${uid}:`, error.message);
            return await User.findOne({ uid });
        }
    }

    /**
     * Authenticate, sync from Firestore, or register a new user in MongoDB
     */
    static async syncOrRegisterUser({ uid, email, name, photo, fcm }) {
        if (!uid) throw new Error('User ID (uid) is required');

        const cleanEmail = email ? email.toLowerCase().trim() : `${uid}@temporary.com`;
        const normalizedName = name ? name.replace(/\s+/g, '').toLowerCase() : '';

        // 1. Check if user already exists in MongoDB
        let user = await User.findOne({ $or: [{ uid }, { email: cleanEmail }] });

        if (user) {
            const updateFields = {
                lastSignIn: new Date()
            };
            if (fcm) updateFields.fcm = fcm;
            if (photo) updateFields.photo = photo;
            if (name) {
                updateFields.name = name;
                updateFields.nameNormalized = normalizedName;
            }
            if (!user.migratedToV2) updateFields.migratedToV2 = true;

            user = await User.findByIdAndUpdate(user._id, { $set: updateFields }, { new: true });
            return user;
        }

        // 2. User not in MongoDB. Check Firestore (in case they are an existing V1 user)
        const db = this.getFirestoreDb();
        if (db) {
            try {
                const doc = await db.collection('users').doc(uid).get();
                if (doc.exists) {
                    const mapped = this.mapUserData(doc.id, doc.data());
                    if (fcm) mapped.fcm = fcm;
                    if (photo) mapped.photo = photo;
                    if (name) {
                        mapped.name = name;
                        mapped.nameNormalized = normalizedName;
                    }
                    mapped.lastSignIn = new Date();
                    mapped.migratedToV2 = true;

                    user = await User.findOneAndUpdate(
                        { uid: mapped.uid },
                        { 
                            $set: mapped,
                            $setOnInsert: {
                                role: doc.data().role || 'client',
                                facebookCookies: '',
                                instagramCookies: ''
                            }
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                    return user;
                }
            } catch (err) {
                console.error('[UserSyncService] Error checking Firestore for migration:', err.message);
            }
        }

        // 3. Brand new user! Create directly in MongoDB
        user = new User({
            uid,
            email: cleanEmail,
            name: name || '',
            nameNormalized: normalizedName,
            photo: photo || '',
            fcm: fcm || '',
            provider: 'Google',
            coins: 0,
            dollars: 0,
            dailyRewards: 50,
            banned: false,
            isVip: false,
            role: 'client',
            migratedToV2: true,
            created: new Date(),
            lastSignIn: new Date()
        });

        await user.save();
        return user;
    }

    /**
     * Bulk migration script to migrate all Firestore users to MongoDB
     */
    static async migrateAllUsers(batchSize = 1000, onProgress = null) {
        const db = this.getFirestoreDb();
        if (!db) throw new Error('Firestore DB not initialized');

        console.log('[UserSyncService] Starting bulk migration from Firestore to MongoDB...');
        let totalProcessed = 0;
        let totalUpserted = 0;
        let totalModified = 0;
        let totalErrors = 0;
        let lastDoc = null;
        let hasMore = true;

        while (hasMore) {
            let query = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(batchSize);
            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }

            const snapshot = await query.get();
            if (snapshot.empty) {
                hasMore = false;
                break;
            }

            const seenEmailsInBatch = new Set();
            const bulkOps = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const mapped = this.mapUserData(doc.id, data);

                // Prevent email collision within same batch
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
                } catch (bErr) {
                    if (bErr.result) {
                        totalUpserted += (bErr.result.nUpserted || bErr.result.upsertedCount || 0);
                        totalModified += (bErr.result.nModified || bErr.result.modifiedCount || 0);
                        totalErrors += (bErr.writeErrors ? bErr.writeErrors.length : 1);
                    } else {
                        console.error('[UserSyncService] Batch bulkWrite error:', bErr.message);
                        totalErrors += bulkOps.length;
                    }
                }
            }

            totalProcessed += snapshot.docs.length;
            lastDoc = snapshot.docs[snapshot.docs.length - 1];

            if (onProgress) {
                onProgress({ totalProcessed, totalUpserted, totalModified, totalErrors });
            }

            console.log(`[UserSyncService] Progress: ${totalProcessed} users processed (${totalUpserted} inserted, ${totalModified} updated, ${totalErrors} errors)...`);

            if (snapshot.docs.length < batchSize) {
                hasMore = false;
            }
        }

        console.log(`[UserSyncService] Bulk migration complete! Processed: ${totalProcessed}, Inserted: ${totalUpserted}, Updated: ${totalModified}, Errors: ${totalErrors}`);
        return { totalProcessed, totalUpserted, totalModified, totalErrors };
    }
}

module.exports = UserSyncService;
