const Log = require('../../models/log');
const statistique = require('../../models/statistique')



// Record version usage
exports.RecordVersion = async (req, res) => {
    try {
        const userId = req.body['user-id'];
        const version = req.body['app-version'];
        const webview = req.body['webview-version'];
        const country = req.body['country'];
        const connection = req.body['connection'];

        if (!userId || !version) {
            return res.status(400).json({
                message: 'Missing required data: user-id and app-version'
            });
        }

        await statistique.findOneAndUpdate(
            { userId },
            {
                version,
                webview,
                connection,
                lastUsed: new Date(),
                country,
                deviceInfo: {
                    platform: req.headers['platform'],
                    deviceModel: req.headers['device-model']
                }
            },
            { upsert: true }
        );

        res.status(200).json({ message: 'Version usage recorded successfully' });
    } catch (error) {
        console.error('Error recording version usage:', error);
        res.status(500).json({ message: 'Error recording version usage' });
    }
}

// version statistics
exports.GetVersionStatistics = async (req, res) => {
    try {
        const statistics = await statistique.aggregate([
            {
                $match: {
                    version: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$version',
                    userCount: { $count: {} },
                }
            },
            {
                $sort: { _id: -1 }
            }
        ]);

        res.status(200).json({
            statistics,
            totalUsers: await statistique.countDocuments()
        });
    } catch (error) {
        console.error('Error fetching version statistics:', error);
        res.status(500).json({ message: 'Error fetching version statistics' });
    }
};

// webview statistics
exports.GetWebviewStatistics = async (req, res) => {
    try {
        const statistics = await statistique.aggregate([
            {
                $match: {
                    webview: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$webview',
                    userCount: { $count: {} },
                }
            },
            {
                $sort: { _id: -1 }
            }
        ]);

        res.status(200).json({
            statistics,
            totalUsers: await statistique.countDocuments({ webview: { $ne: null } })
        });
    } catch (error) {
        console.error('Error fetching webview statistics:', error);
        res.status(500).json({ message: 'Error fetching webview statistics' });
    }
};

// country statistics
exports.GetCountryStatistics = async (req, res) => {
    try {
        const statistics = await statistique.aggregate([
            {
                $group: {
                    _id: { $toLower: '$country' },
                    userCount: { $count: {} }
                }
            },
            {
                $project: {
                    country: '$_id',
                    value: '$userCount',
                    _id: 0
                }
            }
        ]);

        res.status(200).json({
            statistics,
            totalUsers: await statistique.countDocuments()
        });
    } catch (error) {
        console.error('Error fetching country statistics:', error);
        res.status(500).json({ message: 'Error fetching country statistics' });
    }
};

// country statistics
exports.GetConnectionStatistics = async (req, res) => {
    try {
        const statistics = await statistique.aggregate([
            {
                $match: {
                    connection: { $ne: null }
                }
            },
            {
                $group: {
                    _id: { $toLower: '$connection' },
                    userCount: { $count: {} }
                }
            },
            {
                $project: {
                    connection: '$_id',
                    value: '$userCount',
                    _id: 0
                }
            }
        ]);

        res.status(200).json({
            statistics,
            totalUsers: await statistique.countDocuments()
        });
    } catch (error) {
        console.error('Error fetching country statistics:', error);
        res.status(500).json({ message: 'Error fetching country statistics' });
    }
};

// user-specific version information
exports.GetUserVersion = async (req, res) => {
    try {
        const userVersion = await statistique.findOne(
            { userId: req.params.userId },
            { version: 1, lastUsed: 1, deviceInfo: 1, _id: 0 }
        );

        if (!userVersion) {
            return res.status(404).json({ message: 'User version info not found' });
        }

        res.status(200).json(userVersion);
    } catch (error) {
        console.error('Error fetching user version:', error);
        res.status(500).json({ message: 'Error fetching user version' });
    }
};


// Logs
exports.CreateLog = async (req, res) => {
    try {
        const { userId, type, content } = req.body;

        const log = new Log({
            userId,
            type,
            content,
            timestamp: new Date()
        });

        await log.save();
        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: 'Error creating log entry' });
    }
}

exports.GetLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            userId,
            type,
            startDate,
            endDate
        } = req.query;

        const query = {};

        if (userId) query.userId = userId;
        if (type) query.type = type;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await Log.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Log.countDocuments(query);

        res.json({
            logs,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching logs' });
    }
}