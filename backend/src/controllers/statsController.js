const { StudyLog } = require('../../models');

const todayStr = () => new Date().toISOString().slice(0, 10);

const calcStreaks = (sortedDatesDesc) => {
    if (!sortedDatesDesc.length) return { current: 0, longest: 0 };

    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let current = 0;
    if (sortedDatesDesc[0] === today || sortedDatesDesc[0] === yesterday) {
        current = 1;
        for (let i = 1; i < sortedDatesDesc.length; i++) {
            const diff = (new Date(sortedDatesDesc[i - 1]) - new Date(sortedDatesDesc[i])) / 86400000;
            if (diff === 1) current++;
            else break;
        }
    }

    let longest = current, run = 1;
    for (let i = 1; i < sortedDatesDesc.length; i++) {
        const diff = (new Date(sortedDatesDesc[i - 1]) - new Date(sortedDatesDesc[i])) / 86400000;
        if (diff === 1) { run++; if (run > longest) longest = run; }
        else run = 1;
    }

    return { current, longest };
};

const logStudy = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const { deckId, cardId, correct } = req.body;

        if (!userId || correct === undefined || correct === null) {
            return res.status(400).json({
                success: false, data: null,
                error: { code: 'VALIDATION_ERROR', message: '"correct" is required.', details: {} }
            });
        }

        await StudyLog.create({
            userId,
            deckId: deckId || null,
            cardId: cardId || null,
            correct: !!correct,
            studiedAt: todayStr()
        });

        res.status(201).json({ success: true, data: null, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const getStats = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));

        const logs = await StudyLog.findAll({
            where: { userId },
            attributes: ['studiedAt', 'correct'],
            order: [['studiedAt', 'ASC']]
        });

        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        yearAgo.setHours(0, 0, 0, 0);

        const heatmapMap = {};
        const retentionMap = {};
        let totalCards = 0;
        let totalCorrect = 0;

        logs.forEach(({ studiedAt, correct }) => {
            const date = studiedAt;
            totalCards++;
            if (correct) totalCorrect++;

            if (new Date(date) >= yearAgo) {
                heatmapMap[date] = (heatmapMap[date] || 0) + 1;
            }

            if (!retentionMap[date]) retentionMap[date] = { correct: 0, total: 0 };
            retentionMap[date].total++;
            if (correct) retentionMap[date].correct++;
        });

        const heatmap = Object.entries(heatmapMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const retention = Object.entries(retentionMap)
            .map(([date, { correct, total }]) => ({
                date,
                rate: Math.round(correct / total * 100),
                total
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-60);

        const uniqueDatesDesc = [...new Set(logs.map(l => l.studiedAt))].sort().reverse();
        const { current: streak, longest: longestStreak } = calcStreaks(uniqueDatesDesc);

        const overallRate = totalCards ? Math.round(totalCorrect / totalCards * 100) : 0;

        res.status(200).json({
            success: true,
            data: { heatmap, retention, streak, longestStreak, totalCards, totalCorrect, overallRate },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

module.exports = { logStudy, getStats };
