const jwt = require('jsonwebtoken');
const { User, Admin } = require('../../models');

const getAuthFromToken = (req) => {
    const authHeader = req.header('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return { id: payload.id, role: payload.role || 'user' };
    } catch {
        return null;
    }
};

const getModelForRole = (role) => (role === 'admin' ? Admin : User);

const getSettings = async (req, res) => {
    try {
        const auth = getAuthFromToken(req);

        if (!auth) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        const account = await getModelForRole(auth.role).findByPk(auth.id, { attributes: ['username', 'email', 'theme'] });

        if (!account) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: "Settings not found for this account.", details: {} }
            });
        }

        res.status(200).json({ success: true, data: account, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const updateSettings = async (req, res) => {
    try {
        const auth = getAuthFromToken(req);

        if (!auth) {
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

        const account = await getModelForRole(auth.role).findByPk(auth.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: "Settings not found for this account.", details: {} }
            });
        }

        await account.update({ username, email, theme });
        res.status(200).json({ success: true, data: { username: account.username, email: account.email, theme: account.theme }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { getSettings, updateSettings };
