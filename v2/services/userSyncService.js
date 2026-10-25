const User = require('../../models/user');

class UserSyncService {

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
        return await User.findOne({ uid });
    }

    /**
     * Authenticate or register a new user directly in MongoDB (Zero Firestore Reads)
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

        // 3. Brand new user! Create directly in MongoDB with initial points from global Settings
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const initialPoints = globalSettings?.globalDailyReward !== undefined ? Number(globalSettings.globalDailyReward) : 50;

        user = new User({
            uid,
            email: cleanEmail,
            name: name || '',
            nameNormalized: normalizedName,
            photo: photo || '',
            fcm: fcm || '',
            provider: 'Google',
            coins: initialPoints,
            dollars: 0,
            dailyRewards: initialPoints,
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
}

module.exports = UserSyncService;
