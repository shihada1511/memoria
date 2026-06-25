const bcrypt = require('bcryptjs');
const { Admin } = require('../../models');

const PUBLIC_ATTRIBUTES = ['id', 'firstName', 'lastName', 'email', 'createdAt', 'updatedAt'];

const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.findAll({ attributes: PUBLIC_ATTRIBUTES });
        res.status(200).json({ success: true, data: admins, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getAdminById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const admin = await Admin.findByPk(id, { attributes: PUBLIC_ATTRIBUTES });

        if (!admin) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Admin with ID ${id} not found.`, details: {} }
            });
        }

        res.status(200).json({ success: true, data: admin, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const createAdmin = async (req, res) => {
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

        const existing = await Admin.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Email is already in use.", details: {} }
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await Admin.create({ firstName, lastName, username, email, password: hashedPassword });

        res.status(201).json({ success: true, data: { adminId: newAdmin.id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const updateAdmin = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const admin = await Admin.findByPk(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Admin with ID ${id} not found.`, details: {} }
            });
        }

        const { firstName, lastName } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: "VALIDATION_ERROR", message: "Missing required fields.", details: {} }
            });
        }

        await admin.update({ firstName, lastName });
        res.status(200).json({ success: true, data: { adminId: id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const deleteAdmin = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const admin = await Admin.findByPk(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Admin with ID ${id} not found.`, details: {} }
            });
        }

        await admin.destroy();
        res.status(200).json({ success: true, data: { adminId: id }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { getAllAdmins, getAdminById, createAdmin, updateAdmin, deleteAdmin };
