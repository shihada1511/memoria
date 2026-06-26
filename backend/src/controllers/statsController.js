const { StudyLog, Deck, Card, CardProgress } = require('../../models');

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

        // Update SRS card progress
        if (cardId) {
            const today = todayStr();
            const [progress] = await CardProgress.findOrCreate({
                where: { userId, cardId },
                defaults: { userId, cardId, correctCount: 0, incorrectCount: 0, interval: 1, nextReviewAt: today, lastStudiedAt: today }
            });

            const newInterval = correct ? Math.min((progress.interval || 1) * 2, 60) : 1;
            const next = new Date(today + 'T00:00:00');
            next.setDate(next.getDate() + newInterval);

            await progress.update({
                correctCount:   progress.correctCount   + (correct ? 1 : 0),
                incorrectCount: progress.incorrectCount + (correct ? 0 : 1),
                interval:       newInterval,
                nextReviewAt:   next.toISOString().slice(0, 10),
                lastStudiedAt:  today
            });
        }

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
            attributes: ['studiedAt', 'correct', 'deckId'],
            include: [{ model: Deck, as: 'deck', attributes: ['id', 'title', 'subject'], required: false }],
            order: [['studiedAt', 'ASC']]
        });

        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        yearAgo.setHours(0, 0, 0, 0);

        const heatmapMap = {};
        const retentionMap = {};
        const deckMap = {};
        let totalCards = 0;
        let totalCorrect = 0;

        logs.forEach(({ studiedAt, correct, deckId, deck }) => {
            const date = studiedAt;
            totalCards++;
            if (correct) totalCorrect++;

            if (new Date(date) >= yearAgo) {
                heatmapMap[date] = (heatmapMap[date] || 0) + 1;
            }

            if (!retentionMap[date]) retentionMap[date] = { correct: 0, total: 0 };
            retentionMap[date].total++;
            if (correct) retentionMap[date].correct++;

            if (deckId) {
                if (!deckMap[deckId]) deckMap[deckId] = { deckId, title: deck?.title || 'Deleted Deck', subject: deck?.subject || '', correct: 0, total: 0 };
                deckMap[deckId].total++;
                if (correct) deckMap[deckId].correct++;
            }
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

        const deckStats = Object.values(deckMap)
            .map(d => ({ ...d, rate: d.total ? Math.round(d.correct / d.total * 100) : 0 }))
            .sort((a, b) => b.total - a.total);

        res.status(200).json({
            success: true,
            data: { heatmap, retention, streak, longestStreak, totalCards, totalCorrect, overallRate, deckStats },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const today = todayStr();

        const decks = await Deck.findAll({
            where: { userId },
            include: [{ model: Card, as: 'cards', attributes: ['id'] }]
        });
        const allCardIds = decks.flatMap(d => d.cards.map(c => c.id));
        const totalCards = allCardIds.length;

        const progress = await CardProgress.findAll({ where: { userId } });
        const progressMap = {};
        progress.forEach(p => { progressMap[String(p.cardId)] = p; });

        let dueToday = 0;
        const mastery = { new: 0, learning: 0, familiar: 0, mastered: 0 };

        allCardIds.forEach(cardId => {
            const p = progressMap[String(cardId)];
            if (!p) {
                mastery.new++;
                dueToday++;
            } else {
                if (p.nextReviewAt <= today) dueToday++;
                if (p.correctCount < 3)      mastery.learning++;
                else if (p.correctCount < 8) mastery.familiar++;
                else                         mastery.mastered++;
            }
        });

        // Forecast: how many cards have nextReviewAt on each of the next 30 days
        const forecastMap = {};
        for (let i = 0; i <= 30; i++) {
            const d = new Date(today + 'T00:00:00');
            d.setDate(d.getDate() + i);
            forecastMap[d.toISOString().slice(0, 10)] = 0;
        }
        forecastMap[today] = dueToday;

        progress.forEach(p => {
            if (p.nextReviewAt > today && Object.prototype.hasOwnProperty.call(forecastMap, p.nextReviewAt)) {
                forecastMap[p.nextReviewAt]++;
            }
        });

        const forecast = Object.entries(forecastMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.status(200).json({
            success: true,
            data: { dueToday, totalCards, forecast, mastery: { ...mastery, total: totalCards } },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

module.exports = { logStudy, getStats, getDashboardStats };
