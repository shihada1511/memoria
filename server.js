const express = require('express');
const app = express();

const logger = require('./middleware/logger');
const userRoutes = require('./routers/userRoutes');
const deckRoutes = require('./routers/deckRoutes');
const cardRoutes = require('./routers/cardRoutes');
const authRoutes = require('./routers/authRoutes');
const settingsRoutes = require('./routers/settingsRoutes');
const cors = require('cors');

app.use(cors());
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => {
    res.json({ message: "Memoria API is running!" });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/settings', settingsRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is successfully running on http://localhost:${PORT}`);
});
