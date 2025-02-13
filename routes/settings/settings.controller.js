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
                reportHtml: false
            });
        }

        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update settings
exports.updateSettings = async (req, res) => {
    try {
        const { executionMethod, reportErrors, reportHtml } = req.body;

        const settings = await Settings.findOneAndUpdate(
            {},
            {
                executionMethod,
                reportErrors,
                reportHtml
            },
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