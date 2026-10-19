const Settings = require("../../models/settings");


const handleError = (res, error) => {
    const status = error.status || 500;
    const message = error.message || 'Server Error';
    res.status(status).json({ message, error: error.message });
};

// Get settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await Settings.findOne();

        if (!settings) {
            return res.status(200).json({
                executionMethod: '',
                executionMethods: [],
                reportErrors: false,
                reportHtml: false,
                mimicScroll: false,
                rt: 0,
                rrt: 0,
                globalDailyReward: 50,
                rewardDelayMinutes: 30,
                pointsPerDollar: 100,
            });
        }

        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { executionMethod, reportErrors, reportHtml, mimicScroll, rt, rrt, globalDailyReward, rewardDelayMinutes, pointsPerDollar } = req.body;

        const updateData = {
            executionMethod,
            reportErrors,
            reportHtml,
            mimicScroll,
            rt,
            rrt
        };

        if (globalDailyReward !== undefined) {
            updateData.globalDailyReward = Number(globalDailyReward);
        }
        if (rewardDelayMinutes !== undefined) {
            updateData.rewardDelayMinutes = Number(rewardDelayMinutes);
        }
        if (pointsPerDollar !== undefined) {
            updateData.pointsPerDollar = Number(pointsPerDollar);
        }

        const settings = await Settings.findOneAndUpdate(
            {},
            updateData,
            { new: true, upsert: true }
        );

        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all execution methods
exports.getMethods = async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(404).json({ message: 'Settings not found' });
        }
        // Transform the methods array into the expected format
        const executionMethods = settings.executionMethods.map((name, index) => ({
            _id: index.toString(),
            name
        }));
        res.status(200).json({ executionMethods });
    } catch (error) {
        handleError(res, error);
    }
};

exports.addMethod = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name?.trim()) {
            const error = new Error('Method name is required');
            error.status = 400;
            throw error;
        }

        const trimmedName = name.trim();
        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({
                executionMethods: [trimmedName],
                executionMethod: trimmedName,
                reportErrors: false,
                reportHtml: false
            });

            return res.status(201).json({
                _id: '0',
                name: trimmedName
            });
        }

        if (settings.executionMethods.includes(trimmedName)) {
            const error = new Error('Method already exists');
            error.status = 400;
            throw error;
        }

        settings.executionMethods.push(trimmedName);
        await settings.save();

        const newIndex = settings.executionMethods.length - 1;
        res.status(201).json({
            _id: newIndex.toString(),
            name: trimmedName
        });
    } catch (error) {
        handleError(res, error);
    }
};

exports.updateMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name?.trim()) {
            const error = new Error('Method name is required');
            error.status = 400;
            throw error;
        }

        const trimmedName = name.trim();
        const settings = await Settings.findOne();

        if (!settings) {
            const error = new Error('Settings not found');
            error.status = 404;
            throw error;
        }

        const index = parseInt(id);
        if (isNaN(index) || index < 0 || index >= settings.executionMethods.length) {
            const error = new Error('Method not found');
            error.status = 404;
            throw error;
        }

        const existingIndex = settings.executionMethods.indexOf(trimmedName);
        if (existingIndex !== -1 && existingIndex !== index) {
            const error = new Error('Method name already exists');
            error.status = 400;
            throw error;
        }

        const oldName = settings.executionMethods[index];
        settings.executionMethods[index] = trimmedName;

        // Update executionMethod if it matches the old name
        if (settings.executionMethod === oldName) {
            settings.executionMethod = trimmedName;
        }

        await settings.save();

        res.status(200).json({
            _id: id,
            name: trimmedName
        });
    } catch (error) {
        handleError(res, error);
    }
};

exports.deleteMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const settings = await Settings.findOne();

        if (!settings) {
            const error = new Error('Settings not found');
            error.status = 404;
            throw error;
        }

        const index = parseInt(id);
        if (isNaN(index) || index < 0 || index >= settings.executionMethods.length) {
            const error = new Error('Method not found');
            error.status = 404;
            throw error;
        }

        const methodToDelete = settings.executionMethods[index];
        settings.executionMethods.splice(index, 1);

        // Update executionMethod if it matches the deleted method
        if (settings.executionMethod === methodToDelete) {
            settings.executionMethod = settings.executionMethods[0];
        }

        await settings.save();

        res.status(200).json({ message: 'Method deleted successfully' });
    } catch (error) {
        handleError(res, error);
    }
};

// Get all dictionary entries
exports.getDictionaryEntries = async (req, res) => {
    try {
        const settings = await Settings.findOne();

        if (!settings || !settings.dictionary) {
            return res.json({ dictionary: {} });
        }

        const dictionaryObject = {};
        settings.dictionary.forEach((value, key) => {
            dictionaryObject[key] = value;
        });

        return res.json({ dictionary: dictionaryObject });
    } catch (error) {
        handleError(res, error);
    }
};

// Add a dictionary entry
exports.addDictionaryEntry = async (req, res) => {
    try {
        const { key, values } = req.body;

        if (!key?.trim()) {
            const error = new Error('Dictionary key is required');
            error.status = 400;
            throw error;
        }

        if (!values || !Array.isArray(values) || values.length === 0) {
            const error = new Error('Values array is required and must not be empty');
            error.status = 400;
            throw error;
        }

        const trimmedKey = key.trim();
        let settings = await Settings.findOne();

        if (!settings) {
            // Initialize a new dictionary with this entry
            const dictionary = new Map();
            dictionary.set(trimmedKey, values);

            settings = await Settings.create({
                dictionary,
                reportErrors: false,
                reportHtml: false
            });

            return res.status(201).json({
                key: trimmedKey,
                values
            });
        }

        // Ensure dictionary exists
        if (!settings.dictionary) {
            settings.dictionary = new Map();
        }

        // Check if key already exists
        if (settings.dictionary.has(trimmedKey)) {
            const error = new Error('Dictionary key already exists');
            error.status = 400;
            throw error;
        }

        // Add the entry
        settings.dictionary.set(trimmedKey, values);
        await settings.save();

        res.status(201).json({
            key: trimmedKey,
            values
        });
    } catch (error) {
        handleError(res, error);
    }
};

// Update a dictionary entry
exports.updateDictionaryEntry = async (req, res) => {
    try {
        const { key, values } = req.body;

        if (!key?.trim()) {
            const error = new Error('Dictionary key is required');
            error.status = 400;
            throw error;
        }

        if (!values || !Array.isArray(values) || values.length === 0) {
            const error = new Error('Values array is required and must not be empty');
            error.status = 400;
            throw error;
        }

        const trimmedKey = key.trim();
        const settings = await Settings.findOne();

        if (!settings || !settings.dictionary) {
            const error = new Error('Dictionary not found');
            error.status = 404;
            throw error;
        }

        if (!settings.dictionary.has(trimmedKey)) {
            const error = new Error('Dictionary key not found');
            error.status = 404;
            throw error;
        }

        // Update the entry
        settings.dictionary.set(trimmedKey, values);
        await settings.save();

        res.json({
            key: trimmedKey,
            values
        });
    } catch (error) {
        handleError(res, error);
    }
};

// Delete a dictionary entry
exports.deleteDictionaryEntry = async (req, res) => {
    try {
        const { key } = req.params;

        if (!key?.trim()) {
            const error = new Error('Dictionary key is required');
            error.status = 400;
            throw error;
        }

        const trimmedKey = key.trim();
        const settings = await Settings.findOne();

        if (!settings || !settings.dictionary) {
            const error = new Error('Dictionary not found');
            error.status = 404;
            throw error;
        }

        if (!settings.dictionary.has(trimmedKey)) {
            const error = new Error('Dictionary key not found');
            error.status = 404;
            throw error;
        }

        // Delete the entry
        settings.dictionary.delete(trimmedKey);
        await settings.save();

        res.json({
            message: 'Dictionary entry deleted successfully',
            key: trimmedKey
        });
    } catch (error) {
        handleError(res, error);
    }
};


// Get dictionary Mobile 
exports.getDictionary = async (req, res) => {
    try {
        const { key } = req.params;
        const settings = await Settings.findOne();

        if (!settings || !settings.dictionary) {
            return res.json({
                success: true,
                data: key ? null : {},
                message: key ? 'Dictionary key not found' : 'No dictionary entries found'
            });
        }

        if (key) {
            if (!settings.dictionary.has(key)) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'Dictionary key not found'
                });
            }

            return res.json({
                success: true,
                data: {
                    key,
                    values: settings.dictionary.get(key)
                }
            });
        } else {
            const dictionaryData = [];
            settings.dictionary.forEach((values, key) => {
                dictionaryData.push({
                    key,
                    values
                });
            });

            return res.json({
                success: true,
                data: dictionaryData,
                count: dictionaryData.length
            });
        }
    } catch (error) {
        handleError(res, error);
    }
};