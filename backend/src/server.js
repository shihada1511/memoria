require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST']
    }
});

const logger = require('./middleware/logger');
const userRoutes = require('./routers/userRoutes');
const adminRoutes = require('./routers/adminRoutes');
const deckRoutes = require('./routers/deckRoutes');
const cardRoutes = require('./routers/cardRoutes');
const authRoutes = require('./routers/authRoutes');
const settingsRoutes = require('./routers/settingsRoutes');
const aiRoutes = require('./routers/aiRoutes');
const statsRoutes = require('./routers/statsRoutes');
const noteRoutes = require('./routers/noteRoutes');
const socketHandler = require('./socket/socketHandler');
const { sequelize } = require('../models');

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '10mb' }));
app.use(logger);

app.get('/', (req, res) => {
    res.json({ message: "Memoria API is running!" });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notes', noteRoutes);

socketHandler(io);

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
    .then(() => {
        console.log('Database connection established successfully.');
        server.listen(PORT, () => {
            console.log(`Server is successfully running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Unable to connect to the database:', error.message);
        process.exit(1);
    });
