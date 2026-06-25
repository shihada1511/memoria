const bcrypt = require('bcryptjs');
const { User, Admin } = require('../../models');

const PUBLIC_ATTRIBUTES = ['id', 'firstName', 'lastName', 'username', 'email', 'role', 'theme', 'createdAt', 'updatedAt'];

const toPublicAccount = (account, role) => ({
    userId: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    username: account.username,
    email: account.email,
    userRole: role,
    theme: account.theme
});

const toPublicUser = (user) => toPublicAccount(user, user.role);
const toPublicAdmin = (admin) => toPublicAccount(admin, 'admin');

// Tokens are base64("id:email:role"). Older tokens (pre-admin-login) omit the
// role segment and always referred to a User, so default to 'user' for those.
const getAuthFromToken = (req) => {
    const authHeader = req.header('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    const [rawId, , rawRole] = Buffer.from(token, 'base64').toString('utf-8').split(':');
    const id = parseInt(rawId);
    if (Number.isNaN(id)) return null;

    return { id, role: rawRole || 'user' };
};

const getMe = async (req, res) => {
    try {
        const auth = getAuthFromToken(req);

        if (!auth) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        if (auth.role === 'admin') {
            const admin = await Admin.findByPk(auth.id);
            if (!admin) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: { code: "UNAUTHORIZED", message: "Invalid authorization token.", details: {} }
                });
            }
            return res.status(200).json({ success: true, data: toPublicAdmin(admin), error: null });
        }

        const user = await User.findByPk(auth.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Invalid authorization token.", details: {} }
            });
        }

        res.status(200).json({ success: true, data: toPublicUser(user), error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const changePassword = async (req, res) => {
    try {
        const auth = getAuthFromToken(req);

        if (!auth) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        const account = auth.role === 'admin'
            ? await Admin.findByPk(auth.id)
            : await User.findByPk(auth.id);

        if (!account) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Invalid authorization token.", details: {} }
            });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Current and new password are required.", details: {} }
            });
        }

        if (!(await bcrypt.compare(currentPassword, account.password))) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect.", details: {} }
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "New password must be at least 6 characters.", details: {} }
            });
        }

        account.password = await bcrypt.hash(newPassword, 10);
        await account.save();

        res.status(200).json({ success: true, data: { message: "Password updated successfully." }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: PUBLIC_ATTRIBUTES });
        res.status(200).json({ success: true, data: users.map(toPublicUser), error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getUserById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = await User.findByPk(id, { attributes: PUBLIC_ATTRIBUTES });

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `User with ID ${id} not found.`, details: {} }
            });
        }

        res.status(200).json({ success: true, data: toPublicUser(user), error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const createUser = async (req, res) => {
    try {
        const { firstName, lastName, username, email, password } = req.body;

        if (!firstName || !lastName || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing required fields.",
                    details: { required: ["firstName", "lastName", "username", "email", "password"] }
                }
            });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Email is already in use.", details: {} }
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword,
            role: 'user'
        });

        res.status(201).json({ success: true, data: { userId: newUser.id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const updateUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');
        const isElevated = ['admin', 'manager'].includes(requesterRole);

        if (!isElevated && requesterId !== id) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "You can only update your own account.", details: {} }
            });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `User with ID ${id} not found.`, details: {} }
            });
        }

        const { firstName, lastName, userRole } = req.body;

        if (!firstName || !lastName || !userRole) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Missing required fields.", details: {} }
            });
        }

        if (!['user', 'manager'].includes(userRole)) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "userRole must be 'user' or 'manager'.", details: {} }
            });
        }

        if (!isElevated && userRole !== user.role) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "You cannot change your own role.", details: {} }
            });
        }

        if (requesterRole === 'manager' && user.role !== 'user' && requesterId !== id) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "Managers can only manage regular user accounts.", details: {} }
            });
        }

        await user.update({ firstName, lastName, role: userRole });
        res.status(200).json({ success: true, data: { userId: id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const deleteUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        if (!['admin', 'manager'].includes(requesterRole) && requesterId !== id) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "You can only delete your own account.", details: {} }
            });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `User with ID ${id} not found.`, details: {} }
            });
        }

        if (requesterRole === 'manager' && user.role !== 'user' && requesterId !== id) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "Managers can only manage regular user accounts.", details: {} }
            });
        }

        await user.destroy();
        res.status(200).json({ success: true, data: { userId: id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { getMe, changePassword, getAllUsers, getUserById, createUser, updateUser, deleteUser };
