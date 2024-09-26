const User = require('../../models/user')
const admin = require("firebase-admin");
const serviceAccount = require('../../utils/epicsm-app-firebase-adminsdk-a6csy-58907dbb09.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// Initialize Firestore
const db = admin.firestore();

// Create a new user
exports.CreateUser = async (req, res) => {
    try {
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
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No users found' });
        }

        const users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get users length from firebase
exports.GetFirebaseUsersLength = async (req, res) => {
    try {
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