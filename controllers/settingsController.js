let mockData = require('../models/mockData');

const getUserIdFromToken = (req) => {
    const authHeader = req.header('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return null;

    const [userId] = Buffer.from(token, 'base64').toString('utf-8').split(':');
    const parsed = parseInt(userId);
    return Number.isNaN(parsed) ? null : parsed;
};

const getSettings = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        const userSettings = mockData.settings.find(s => s.userId === userId);

        if (!userSettings) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: "Settings not found for this user.", details: {} }
            });
        }

        res.status(200).json({ success: true, data: userSettings, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const updateSettings = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        const { username, email, theme } = req.body;

        if (!username || !email || !theme) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "username, email and theme are all required.",
                    details: { required: ["username", "email", "theme"] }
                }
            });
        }

        const settingsIndex = mockData.settings.findIndex(s => s.userId === userId);

        if (settingsIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: "Settings not found for this user.", details: {} }
            });
        }

        mockData.settings[settingsIndex] = { userId, username, email, theme };
        res.status(200).json({ success: true, data: mockData.settings[settingsIndex], error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { getSettings, updateSettings };
