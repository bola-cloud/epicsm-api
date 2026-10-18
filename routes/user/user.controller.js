const User = require('../../models/user')
const authController = require('../authentication/authentication.controller')
const admin = require("firebase-admin");
const { Parser } = require("json2csv");

let serviceAccount;
let db = null;
try {
    serviceAccount = require('../../utils/epicsm-app-firebase-adminsdk-a6csy-58907dbb09.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
} catch (err) {
    console.error("⚠️ FIREBASE JSON IS MISSING! The server started, but Firebase functions will fail until the file is restored.", err.message);
}



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

// Get all users from MongoDB (with full pagination and formatting)
exports.GetFirebaseUsers = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { page = 1, limit = 10 } = req.query;
        const pageSize = parseInt(limit, 10);
        const pageNumber = parseInt(page, 10);

        const totalUsers = await User.countDocuments();
        const mongoUsers = await User.find()
            .sort({ created: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        const users = mongoUsers.map(u => ({
            id: u.uid || u._id.toString(),
            _id: u._id,
            uid: u.uid,
            email: u.email,
            name: u.name || `${u.prenom || ''} ${u.nom || ''}`.trim(),
            nom: u.nom,
            prenom: u.prenom,
            photo: u.photo,
            dollars: u.dollars || 0,
            coins: u.coins !== undefined ? u.coins : (u.dollars || 0),
            dailyRewards: u.dailyRewards || 50,
            banned: Boolean(u.banned),
            isVip: Boolean(u.isVip),
            role: u.role || 'client',
            created: u.created,
            lastSignIn: u.lastSignIn,
            fcm: u.fcm || ''
        }));

        return res.status(200).json({
            users,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(totalUsers / pageSize),
            totalUsers,
        });

    } catch (error) {
        console.error('Error fetching users from MongoDB:', error);
        return res.status(500).json({
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Search Users Endpoint - Dedicated to MongoDB search functionality
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

        const rawTerm = query.trim();
        const safeRegex = new RegExp(rawTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');

        const searchFilter = {
            $or: [
                { email: safeRegex },
                { name: safeRegex },
                { uid: rawTerm }
            ]
        };

        const totalUsers = await User.countDocuments(searchFilter);
        const mongoUsers = await User.find(searchFilter)
            .sort({ created: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        const users = mongoUsers.map(u => ({
            id: u.uid || u._id.toString(),
            _id: u._id,
            uid: u.uid,
            email: u.email,
            name: u.name || `${u.prenom || ''} ${u.nom || ''}`.trim(),
            nom: u.nom,
            prenom: u.prenom,
            photo: u.photo,
            dollars: u.dollars || 0,
            coins: u.coins !== undefined ? u.coins : (u.dollars || 0),
            dailyRewards: u.dailyRewards || 50,
            banned: Boolean(u.banned),
            isVip: Boolean(u.isVip),
            role: u.role || 'client',
            created: u.created,
            lastSignIn: u.lastSignIn,
            fcm: u.fcm || ''
        }));

        return res.status(200).json({
            users,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(totalUsers / pageSize),
            totalUsers,
        });

    } catch (error) {
        console.error('Error searching users in MongoDB:', error);
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

        const mongoUsers = await User.find()
            .sort({ lastSignIn: -1 })
            .limit(6);

        const users = mongoUsers.map(u => ({
            id: u.uid || u._id.toString(),
            _id: u._id,
            uid: u.uid,
            email: u.email,
            name: u.name || `${u.prenom || ''} ${u.nom || ''}`.trim(),
            photo: u.photo,
            dollars: u.dollars || 0,
            coins: u.coins !== undefined ? u.coins : (u.dollars || 0),
            dailyRewards: u.dailyRewards || 50,
            banned: Boolean(u.banned),
            isVip: Boolean(u.isVip),
            role: u.role || 'client',
            created: u.created,
            lastSignIn: u.lastSignIn
        }));

        return res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get users length from MongoDB
exports.GetFirebaseUsersLength = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const totalUsers = await User.countDocuments();
        if (totalUsers === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        res.status(200).json(totalUsers);
    } catch (error) {
        console.error('Error getting users count from MongoDB:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get a user by id from MongoDB (with fallback to Firestore)
exports.GetFirebaseUserById = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: userId }, { uid: userId }] } : { uid: userId };
        let user = await User.findOne(query);

        if (!user && db) {
            try {
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                if (doc.exists) {
                    user = { id: doc.id, ...doc.data() };
                }
            } catch (fErr) {
                console.warn('Firestore fallback fetch warning:', fErr.message);
            }
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const result = user.toObject ? { id: user.uid || user._id.toString(), ...user.toObject() } : user;
        res.status(200).json(result);
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

// Delete user from MongoDB (and Firestore/Auth if available)
exports.DeleteFirebaseUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: userId }, { uid: userId }] } : { uid: userId };
        await User.findOneAndDelete(query);

        try {
            if (db) {
                await db.collection('users').doc(userId).delete();
            }
            await admin.auth().deleteUser(userId);
        } catch (fErr) {
            console.warn('Firebase delete user warning:', fErr.message);
        }

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
        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: userId }, { uid: userId }] } : { uid: userId };
        await User.findOneAndUpdate(query, { $set: { banned: true } });

        try {
            await admin.auth().updateUser(userId, { disabled: true });
            if (db) {
                await db.collection('users').doc(userId).update({ banned: true });
            }
        } catch (fErr) {
            console.warn('Firebase ban warning:', fErr.message);
        }

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
        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: userId }, { uid: userId }] } : { uid: userId };
        await User.findOneAndUpdate(query, { $set: { banned: false } });

        try {
            await admin.auth().updateUser(userId, { disabled: false });
            if (db) {
                await db.collection('users').doc(userId).update({ banned: false });
            }
        } catch (fErr) {
            console.warn('Firebase unban warning:', fErr.message);
        }

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
        const numBalance = Number(Balance);

        if (isNaN(numBalance)) {
            return res.status(400).json({ message: 'Valid balance is required' });
        }

        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: userId }, { uid: userId }] } : { uid: userId };
        const updatedUser = await User.findOneAndUpdate(
            query,
            { $inc: { dollars: numBalance, coins: numBalance } },
            { new: true }
        );

        try {
            if (db) {
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                if (doc.exists) {
                    await userRef.update({ dollars: (doc.data().dollars || 0) + numBalance });
                }
            }
        } catch (fErr) {
            console.warn('Firestore add balance warning:', fErr.message);
        }

        const newDollars = updatedUser ? updatedUser.dollars : numBalance;
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
        const numReward = Number(dailyRewards);

        if (isNaN(numReward) || numReward < 0) {
            return res.status(400).json({ message: 'dailyRewards must be a valid positive number' });
        }

        // 1. Update in Firestore (if available)
        try {
            if (db) {
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                if (doc.exists) {
                    await userRef.update({ dailyRewards: numReward });
                }
            }
        } catch (fErr) {
            console.error("Firestore update reward warning:", fErr.message);
        }

        // 2. Update in MongoDB
        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { _id: userId } : { uid: userId };
        await User.findOneAndUpdate(query, { $set: { dailyRewards: numReward } });

        res.status(200).json({ message: `User ${userId}'s dailyRewards updated to ${numReward}.` });
    } catch (error) {
        console.error('Error updating daily rewards:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// export all users
exports.ExportFirebaseUsersCSV = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const usersRef = db.collection("users");
        const snapshot = await usersRef.get();

        const users = snapshot.docs.map((doc) => ({
            email: doc.data().email, // Extract only the email field
        }));

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        const fields = ["email"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(users);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=users.csv");
        res.status(200).send(csv);
    } catch (error) {
        console.error("Error exporting users:", error);
        res.status(500).json({ message: "Failed to export users", error: error.message });
    }
};

// get banned users
exports.GetBannedUsers = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const usersRef = admin.firestore().collection('users');
        const bannedSnapshot = await usersRef
            .where('banned', '==', true)
            .get();

        const bannedUsers = [];
        bannedSnapshot.forEach(doc => {
            bannedUsers.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return res.status(200).json(bannedUsers);

    } catch (error) {
        console.error('Error fetching banned users:', error);
        return res.status(500).json({
            message: 'Error fetching banned users',
            error: error.message
        });
    }
};

// Update user VIP status
exports.UpdateUserVipStatus = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.params.id;
        const { isVip } = req.body;

        if (isVip === undefined) {
            return res.status(400).json({ message: 'isVip field is required' });
        }

        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await userRef.update({ isVip: isVip });

        res.status(200).json({
            message: `User ${userId}'s VIP status updated to ${isVip ? 'enabled' : 'disabled'}.`,
            isVip: isVip
        });
    } catch (error) {
        console.error('Error updating VIP status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};