const bcrypt = require('bcryptjs');
const { User } = require('../../models');

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

        const user = await User.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", details: {} }
            });
        }

        const token = Buffer.from(`${user.id}:${user.email}`).toString('base64');

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    userId: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    userRole: user.role
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
