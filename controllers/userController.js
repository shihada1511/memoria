let { users } = require('../models/mockData');

const getMe = async (req, res) => {
    try {
        const authHeader = req.header('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        const [userId] = Buffer.from(token, 'base64').toString('utf-8').split(':');
        const user = users.find(u => u.userId === parseInt(userId));

        if (!user) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Invalid authorization token.", details: {} }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                userRole: user.userRole
            },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const changePassword = async (req, res) => {
    try {
        const authHeader = req.header('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization token.", details: {} }
            });
        }

        const [userIdStr] = Buffer.from(token, 'base64').toString('utf-8').split(':');
        const user = users.find(u => u.userId === parseInt(userIdStr));

        if (!user) {
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

        if (user.password !== currentPassword) {
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

        user.password = newPassword;
        user.updateDate = new Date().toISOString();

        res.status(200).json({ success: true, data: { message: "Password updated successfully." }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getAllUsers = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: users,
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getUserById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = users.find(u => u.userId === id);

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `User with ID ${id} not found.`, details: {} }
            });
        }

        res.status(200).json({ success: true, data: user, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const createUser = async (req, res) => {
    try {
        const { firstName, lastName, userRole } = req.body;

        if (!firstName || !lastName || !userRole) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing required fields.",
                    details: { required: ["firstName", "lastName", "userRole"] }
                }
            });
        }

        const newUser = {
            userId: users.length > 0 ? Math.max(...users.map(u => u.userId)) + 1 : 1,
            firstName,
            lastName,
            createDate: new Date().toISOString(),
            updateDate: new Date().toISOString(),
            userRole
        };

        users.push(newUser);
        res.status(201).json({ success: true, data: { userId: newUser.userId }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const updateUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        if (!['admin', 'manager'].includes(requesterRole) && requesterId !== id) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "You can only update your own account.", details: {} }
            });
        }

        const { firstName, lastName, userRole } = req.body;
        const userIndex = users.findIndex(u => u.userId === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `User with ID ${id} not found.`, details: {} }
            });
        }

        if (!firstName || !lastName || !userRole) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Missing required fields.", details: {} }
            });
        }

        users[userIndex] = { ...users[userIndex], firstName, lastName, userRole, updateDate: new Date().toISOString() };
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

        const userIndex = users.findIndex(u => u.userId === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `User with ID ${id} not found.`, details: {} }
            });
        }

        users.splice(userIndex, 1);
        res.status(200).json({ success: true, data: { userId: id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { getMe, changePassword, getAllUsers, getUserById, createUser, updateUser, deleteUser };