/**
 * Run once before demo to seed activity dots on the calendar:
 *   node seed-demo.js
 */
require('dotenv').config();
const { sequelize } = require('./models');

const DATES = [
    { date: '2026-06-10', correct: 12, incorrect: 3 },
    { date: '2026-06-14', correct: 20, incorrect: 5 },
    { date: '2026-06-18', correct: 8,  incorrect: 2 },
    { date: '2026-06-25', correct: 35, incorrect: 6 },
];

(async () => {
    try {
        const [[firstUser]] = await sequelize.query('SELECT id FROM Users LIMIT 1');
        if (!firstUser) { console.log('No users found — create an account first.'); process.exit(0); }
        const userId = firstUser.id;

        const [[firstDeck]] = await sequelize.query(`SELECT id FROM Decks WHERE userId = ${userId} LIMIT 1`);
        const deckId = firstDeck ? firstDeck.id : 'NULL';

        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

        for (const { date, correct, incorrect } of DATES) {
            // Skip if already seeded
            const [[existing]] = await sequelize.query(
                `SELECT COUNT(*) AS cnt FROM StudyLogs WHERE userId = ${userId} AND studiedAt = '${date}'`
            );
            if (existing.cnt > 0) { console.log(`${date}: already has data, skipping.`); continue; }

            const rows = [
                ...Array.from({ length: correct },   () => `(${userId}, ${deckId}, NULL, 1, '${date}', '${now}', '${now}')`),
                ...Array.from({ length: incorrect },  () => `(${userId}, ${deckId}, NULL, 0, '${date}', '${now}', '${now}')`),
            ];
            await sequelize.query(
                `INSERT INTO StudyLogs (userId, deckId, cardId, correct, studiedAt, createdAt, updatedAt) VALUES ${rows.join(',')}`
            );
            console.log(`${date}: seeded ${correct} correct + ${incorrect} incorrect`);
        }

        console.log('Done!');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
})();
