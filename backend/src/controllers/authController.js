const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Admin } = require('../../models');

const issueSession = (res, account, role) => {
    const token = jwt.sign(
        { id: account.id, email: account.email, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.status(200).json({
        success: true,
        data: {
            token,
            user: {
                userId: account.id,
                firstName: account.firstName,
                lastName: account.lastName,
                username: account.username ?? null,
                email: account.email,
                userRole: role,
                theme: account.theme ?? null
            }
        },
        error: null
    });
};

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
        if (user && await bcrypt.compare(password, user.password)) {
            return issueSession(res, user, user.role);
        }

        const admin = await Admin.findOne({ where: { email } });
        if (admin && await bcrypt.compare(password, admin.password)) {
            return issueSession(res, admin, 'admin');
        }

        return res.status(401).json({
            success: false,
            data: null,
            error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", details: {} }
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
