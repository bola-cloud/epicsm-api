const socialmedia = require('../../models/socialmedia')


// Get all users
exports.GetAccounts = async (req, res) => {
    try {
        const accounts = await socialmedia.find();

        if (accounts) {
            return res.status(200).json(accounts);
        } else {
            return res.status(404).json({ message: 'No accounts found' });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Get a user by ID
exports.GetAccountByID = async (req, res) => {
    try {
        const account = await socialmedia.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Account not found' });
        return res.status(200).json(account);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Delete a user by ID
exports.DeleteAccount = async (req, res) => {
    try {
        const account = await socialmedia.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ message: 'Account not found' });
        res.json({ message: 'Account deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};