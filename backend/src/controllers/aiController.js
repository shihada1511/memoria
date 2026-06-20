const { GoogleGenerativeAI } = require('@google/generative-ai');

const getClient = () => {
    const key = process.env.AI_API_KEY;
    if (!key) return null;
    return new GoogleGenerativeAI(key);
};

/**
 * POST /api/ai/generate-cards
 * Body: { topic: string, count?: number }
 *
 * Generates flashcard Q&A pairs for the given topic using the AI provider.
 */
const generateCards = async (req, res) => {
    try {
        const { topic, count = 5 } = req.body;

        if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'A non-empty "topic" string is required.',
                    details: { required: ['topic'] }
                }
            });
        }

        const client = getClient();
        if (!client) {
            return res.status(503).json({
                success: false,
                data: null,
                error: {
                    code: 'AI_NOT_CONFIGURED',
                    message: 'AI service is not configured. Please set AI_API_KEY in the environment.',
                    details: {}
                }
            });
        }

        const cardCount = Math.min(Math.max(parseInt(count) || 5, 1), 20);

        const prompt = `You are a flashcard generator for a study app called Memoria.
Generate exactly ${cardCount} flashcard question-answer pairs about: "${topic.trim()}".

Rules:
- Questions should be clear and specific
- Answers should be concise but complete (1-3 sentences max)
- Cover different aspects of the topic
- Do NOT number the cards

Respond ONLY with a valid JSON array, no markdown, no extra text:
[
  { "question": "...", "answer": "..." },
  ...
]`;

        const model = client.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
                responseMimeType: 'application/json'
            }
        });

        const result = await model.generateContent(prompt);
        const raw = result.response.text()?.trim() || '';

        let cards;
        try {
            // Strip optional markdown fences
            const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            cards = JSON.parse(json);
            if (!Array.isArray(cards)) throw new Error('Expected array');
        } catch {
            return res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'AI_PARSE_ERROR',
                    message: 'AI returned an unexpected format.',
                    details: { raw }
                }
            });
        }

        const validated = cards
            .filter(c => c && typeof c.question === 'string' && typeof c.answer === 'string')
            .map(c => ({ question: c.question.trim(), answer: c.answer.trim() }));

        res.status(200).json({
            success: true,
            data: {
                topic: topic.trim(),
                cards: validated
            },
            error: null
        });
    } catch (error) {
        const isAuthError = (error?.status === 400 || error?.status === 403) &&
            /api key/i.test(error?.message || '');
        res.status(isAuthError ? 401 : 500).json({
            success: false,
            data: null,
            error: {
                code: isAuthError ? 'INVALID_API_KEY' : 'SERVER_ERROR',
                message: isAuthError
                    ? 'The AI API key is invalid or expired.'
                    : 'An unexpected error occurred while calling the AI service.',
                details: {}
            }
        });
    }
};

module.exports = { generateCards };
