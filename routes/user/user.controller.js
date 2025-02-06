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
// Get Users Endpoint - Clean and focused on pagination
exports.GetFirebaseUsers = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { page = 1, limit = 10 } = req.query;
        const pageSize = parseInt(limit, 10);
        const pageNumber = parseInt(page, 10);

        const usersRef = db.collection('users');

        // Get total count for pagination
        const totalCountSnapshot = await usersRef.count().get();
        const totalUsers = totalCountSnapshot.data().count;

        // Get paginated users
        const query = usersRef
            .orderBy('created', 'desc')
            .limit(pageSize)
            .offset((pageNumber - 1) * pageSize);

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json({
            users,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(totalUsers / pageSize),
            totalUsers,
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Search Users Endpoint - Dedicated to search functionality
exports.SearchFirebaseUsers = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { query = "", page = 1, limit = 10 } = req.query;
        const pageSize = parseInt(limit, 10);
        const pageNumber = parseInt(page, 10);

        if (!query.trim()) {
            return res.status(400).json({
                message: 'Search query is required'
            });
        }

        const usersRef = db.collection('users');
        const searchTerm = query.toLowerCase().trim();

        // Composite query for both email and name
        const [emailSnapshot, nameSnapshot] = await Promise.all([
            // Search by email
            usersRef
                .where('email', '>=', searchTerm)
                .where('email', '<=', searchTerm + '\uf8ff')
                .orderBy('email')
                .get(),

            // Search by normalized name
            usersRef
                .where('nameNormalized', '>=', searchTerm)
                .where('nameNormalized', '<=', searchTerm + '\uf8ff')
                .orderBy('nameNormalized')
                .get()
        ]);

        // Combine and deduplicate results
        const emailResults = emailSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const nameResults = nameSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Deduplicate results based on user ID
        const combinedResults = [...emailResults, ...nameResults];
        const uniqueResults = Array.from(
            new Map(combinedResults.map(item => [item.id, item])).values()
        );

        // Manual pagination of results
        const startIndex = (pageNumber - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = uniqueResults.slice(startIndex, endIndex);

        return res.status(200).json({
            users: paginatedResults,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(uniqueResults.length / pageSize),
            totalUsers: uniqueResults.length,
        });

    } catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).json({
            message: 'Failed to search users',
            error: error.message
        });
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