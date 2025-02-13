const { default: mongoose } = require("mongoose");
const Blocked = require("../../models/blocked");
const User = require('../../models/user')


// Helper function to validate Firebase UID format
const isValidFirebaseUID = (uid) => {
    return /^[A-Za-z0-9]{28}$/.test(uid);
};

// Get Blocked
exports.getLists = async (req, res) => {
    try {
        const blockedData = await Blocked.findOne();
        if (!blockedData) {
            return res.json({ blockedAP: [], blockedPL: [] });
        }
        res.json(blockedData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching blocked data', error: error.message });
    }
};

exports.addToBlockedAP = async (req, res) => {
    try {
        const { value } = req.body;
        if (!value) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Validate Firebase UID format
        if (!isValidFirebaseUID(value)) {
            return res.status(400).json({ message: 'Invalid Firebase UID format' });
        }

        let blockedData = await Blocked.findOne();
        if (!blockedData) {
            blockedData = new Blocked({
                blockedAP: [value],
                blockedPL: []
            });
        } else {
            // Check if value already exists
            if (blockedData.blockedAP.includes(value)) {
                return res.status(400).json({ message: 'User ID already exists in blockedAP' });
            }
            blockedData.blockedAP.push(value);
        }

        await blockedData.save();
        res.json(blockedData);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to blockedAP', error: error.message });
    }
};

exports.addToBlockedPL = async (req, res) => {
    try {
        const { value } = req.body;
        if (!value) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Validate Firebase UID format
        if (!isValidFirebaseUID(value)) {
            return res.status(400).json({ message: 'Invalid Firebase UID format' });
        }

        let blockedData = await Blocked.findOne();
        if (!blockedData) {
            blockedData = new Blocked({
                blockedAP: [],
                blockedPL: [value]
            });
        } else {
            // Check if value already exists
            if (blockedData.blockedPL.includes(value)) {
                return res.status(400).json({ message: 'User ID already exists in blockedPL' });
            }
            blockedData.blockedPL.push(value);
        }

        await blockedData.save();
        res.json(blockedData);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to blockedPL', error: error.message });
    }
};

exports.DeleteID = async (req, res) => {
    try {
        const { type, value } = req.params;
        if (!['ap', 'pl'].includes(type.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid block type. Must be either "ap" or "pl"' });
        }

        const blockedData = await Blocked.findOne();
        if (!blockedData) {
            return res.status(404).json({ message: 'No blocked data found' });
        }

        const arrayField = type.toLowerCase() === 'ap' ? 'blockedAP' : 'blockedPL';
        const index = blockedData[arrayField].indexOf(value);

        if (index === -1) {
            return res.status(404).json({ message: `Value "${value}" not found in blocked${type.toUpperCase()}` });
        }

        blockedData[arrayField].splice(index, 1);
        await blockedData.save();

        res.json(blockedData);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting blocked value', error: error.message });
    }
}