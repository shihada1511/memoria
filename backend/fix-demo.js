require('dotenv').config();
const { sequelize } = require('./models');

(async () => {
    try {
        const [[u]] = await sequelize.query('SELECT id FROM Users LIMIT 1');
        const [[d]] = await sequelize.query(`SELECT id FROM Decks WHERE userId = ${u.id} LIMIT 1`);
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

        // June 18: add 15 rows → total 25 (shows as Jun 19 in UTC+3, medium blue dot)
        const r18 = Array.from({ length: 15 }, () =>
            `(${u.id}, ${d.id}, NULL, 1, '2026-06-18', '${now}', '${now}')`
        ).join(',');
        await sequelize.query(`INSERT INTO StudyLogs (userId, deckId, cardId, correct, studiedAt, createdAt, updatedAt) VALUES ${r18}`);
        console.log('Jun 18: +15 rows → 25 total (medium blue)');

        // June 25: add 4 rows → total 45 (shows as Jun 26 in UTC+3, dark blue dot)
        const r25 = Array.from({ length: 4 }, () =>
            `(${u.id}, ${d.id}, NULL, 1, '2026-06-25', '${now}', '${now}')`
        ).join(',');
        await sequelize.query(`INSERT INTO StudyLogs (userId, deckId, cardId, correct, studiedAt, createdAt, updatedAt) VALUES ${r25}`);
        console.log('Jun 25: +4 rows → 45 total (dark blue)');

        // Capitalize card 17
        await sequelize.query(
            `UPDATE Cards SET
                question = 'What is an Artificial Neural Network (ANN)?',
                answer   = 'A computational model inspired by the human brain, consisting of interconnected nodes arranged in layers that learn patterns from data.'
             WHERE id = 17`
        );
        console.log('Card 17: question + answer capitalized/improved');

        // Capitalize card 24
        await sequelize.query(
            `UPDATE Cards SET
                question = 'What is React.js?',
                answer   = 'A declarative, component-based JavaScript library for building user interfaces, developed and maintained by Meta.'
             WHERE id = 24`
        );
        console.log('Card 24: question + answer capitalized/improved');

        console.log('All done.');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
})();
