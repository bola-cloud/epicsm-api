const statistique = require('../../models/statistique')



// Record version usage
exports.RecordVersion = async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const version = req.headers['app-version'];
        const webview = req.headers['webview-version'];
        const country = req.headers['country'];
        const connection = req.headers['connection'];

        if (!userId || !version) {
            return res.status(400).json({
                message: 'Missing required headers: user-id and app-version'
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