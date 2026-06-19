let { users } = require('../models/mockData');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Email and password are required.", details: {} }
            });
        }

        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", details: {} }
            });
        }

        const token = Buffer.from(`${user.userId}:${user.email}`).toString('base64');

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    userRole: user.userRole
                }
            },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const logout = async (req, res) => {
    try {
        res.status(200).json({ success: true, data: { message: "Logged out successfully." }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { login, logout };
