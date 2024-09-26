const User = require('../../models/user')
const authController = require('../authentication/authentication.controller')
const admin = require("firebase-admin");
const serviceAccount = require('../../utils/epicsm-app-firebase-adminsdk-a6csy-58907dbb09.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// Initialize Firestore
const db = admin.firestore();


// One-time script to normalize names in the Firestore database
const normalizeNames = async () => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    snapshot.forEach(async (doc) => {
        const userData = doc.data();
        const normalizedName = userData.name.replace(/\s+/g, '').toLowerCase();

        await usersRef.doc(doc.id).update({
            nameNormalized: normalizedName,
        });
    });
};


// Create a new user
exports.CreateUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { email, nom, prenom, fcm, photo, provider, role } = req.body;

        const newUser = new User({
            email,
            nom,
            prenom,
            fcm,
            photo,
            provider,
            role
        });

        const user = await newUser.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Get all users from firebase
exports.GetFirebaseUsers = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const usersRef = db.collection('users');
        const { page = 1, limit = 10, searchQuery = "" } = req.query;

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        const offset = (pageNumber - 1) * pageSize;

        let users = [];
        let query = usersRef;

        if (searchQuery) {
            normalizeNames();
            const lowerCaseSearchQuery = searchQuery.toLowerCase().replace(/\s+/g, '');

            try {
                const idSnapshot = await usersRef.doc(searchQuery).get();
                if (idSnapshot.exists) {
                    users.push({ id: idSnapshot.id, ...idSnapshot.data() });
                }
            } catch (err) {
                console.error("Error querying by ID: ", err);
            }

            let emailQuery = usersRef
                .where('email', '>=', lowerCaseSearchQuery)
                .where('email', '<=', lowerCaseSearchQuery + '\uf8ff')
                .orderBy('email')
                .limit(pageSize);

            const emailSnapshot = await emailQuery.get();
            const emailResults = emailSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            users = [...users, ...emailResults];

            const searchTerms = lowerCaseSearchQuery.split(" ");
            if (searchTerms.length > 1) {
                const nameQuery = usersRef
                    .where('nameNormalized', '>=', searchTerms.join(''))
                    .where('nameNormalized', '<=', searchTerms.join('') + '\uf8ff')
                    .orderBy('nameNormalized')
                    .limit(pageSize);

                const nameSnapshot = await nameQuery.get();
                const nameResults = nameSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                users = [...users, ...nameResults];
            } else {
                const singleNameQuery = usersRef
                    .where('nameNormalized', '>=', lowerCaseSearchQuery)
                    .where('nameNormalized', '<=', lowerCaseSearchQuery + '\uf8ff')
                    .orderBy('nameNormalized')
                    .limit(pageSize);

                const singleNameSnapshot = await singleNameQuery.get();
                const singleNameResults = singleNameSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                users = [...users, ...singleNameResults];
            }

            users = users.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        } else {
            query = query.orderBy('id').limit(pageSize);

            if (offset > 0) {
                const prevSnapshot = await usersRef.orderBy('id').limit(offset).get();
                const lastVisible = prevSnapshot.docs[prevSnapshot.docs.length - 1];
                query = query.startAfter(lastVisible);
            }

            const snapshot = await query.get();

            users = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }

        const totalSnapshot = await usersRef.get();
        const totalUsers = totalSnapshot.size;

        res.status(200).json({
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(totalUsers / pageSize),
            totalUsers,
            users,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Users ordered by last sign in
exports.GetUsersByLastSignIn = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const usersRef = db.collection('users');

        const snapshot = await usersRef.orderBy('lastSignIn', 'desc').limit(6).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No users found' });
        }

        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        return res.status(200).json(users);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get users length from firebase
exports.GetFirebaseUsersLength = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No users found' });
        }

        const users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(users.length);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a user by id from firebase
exports.GetFirebaseUserById = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user data
        const user = { id: doc.id, ...doc.data() };
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all users
exports.GetUsers = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const users = await User.find();

        if (users) {
            return res.status(200).json(users);
        } else {
            return res.status(404).json({ message: 'No users found' });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a user by ID
exports.GetUserByID = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update a user by ID
exports.UpdateUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete a user by ID
exports.DeleteUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete user from firestore
exports.DeleteFirebaseUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await userRef.delete();

        await admin.auth().deleteUser(userId);

        res.status(200).json({ message: `User ${userId} has been deleted.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Ban User
exports.BanUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        await admin.auth().updateUser(userId, { disabled: true });

        const userRef = admin.firestore().collection('users').doc(userId);
        await userRef.update({ banned: true });

        res.status(200).json({ message: `User ${userId} has been banned (disabled).` });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ message: error.message });
    }
};


// Unban User
exports.UnbanUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        await admin.auth().updateUser(userId, { disabled: false });

        const userRef = admin.firestore().collection('users').doc(userId);
        await userRef.update({ banned: false });

        res.status(200).json({ message: `User ${userId} has been unbanned (enabled).` });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ message: error.message });
    }
};


// Add Balance
exports.AddBalanceToUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const { Balance } = req.body;

        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentDollars = doc.data().dollars || 0;

        const newDollars = currentDollars + Balance;

        await userRef.update({ dollars: newDollars });

        res.status(200).json({ message: `User ${userId}'s balance updated to ${newDollars} dollars.` });
    } catch (error) {
        console.error('Error adding balance:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


// Update DailyReward
exports.UpdateDailyReward = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const { dailyRewards } = req.body;

        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await userRef.update({ dailyRewards });

        res.status(200).json({ message: `User ${userId}'s dailyRewards updated to ${dailyRewards} dollars.` });
    } catch (error) {
        console.error('Error adding balance:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};