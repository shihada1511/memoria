const OpenAI = require('openai');

const getClient = () => {
    const key = process.env.AI_API_KEY;
    if (!key) return null;
    return new OpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' });
};

// Vision models sometimes wrap JSON in markdown — try direct parse then regex extraction
const extractCards = (raw) => {
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cards)) return parsed.cards;
    } catch (_) {}

    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed.cards)) return parsed.cards;
        } catch (_) {}
    }
    return null;
};

/**
 * POST /api/ai/generate-cards
 * Body: { topic?: string, count?: number, imageBase64?: string }
 *
 * Either topic or imageBase64 must be provided.
 * When imageBase64 is present, uses Groq's vision model (llama-3.2-11b-vision-preview).
 */
const generateCards = async (req, res) => {
    try {
        const { topic, count = 5, imageBase64 } = req.body;

        const hasTopic = topic && typeof topic === 'string' && topic.trim().length > 0;
        const hasImage = imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/');

        if (!hasTopic && !hasImage) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Provide a topic, an image, or both.',
                    details: { required: ['topic or imageBase64'] }
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

        let model, messages, completionOptions;

        if (hasImage) {
            model = 'llama-3.2-11b-vision-preview';

            const textPrompt = `Analyze this image and generate exactly ${cardCount} flashcard question-answer pairs about the content you see.
${hasTopic ? `Focus especially on: "${topic.trim()}".` : 'Cover the main academic or technical concepts visible in the image.'}

Rules:
- Questions should be clear, specific, and testable
- Answers should be concise but complete (1-3 sentences)
- Base every question on actual content from the image — do not invent details

Respond ONLY with a valid JSON object, no markdown, no extra text:
{"cards": [{"question": "...", "answer": "..."}, ...]}`;

            messages = [{
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: imageBase64 } },
                    { type: 'text', text: textPrompt }
                ]
            }];

            // Vision models don't support response_format JSON mode on Groq
            completionOptions = { model, messages, temperature: 0.7, max_tokens: 2000 };
        } else {
            model = 'llama-3.3-70b-versatile';

            const prompt = `You are a flashcard generator for a study app called Memoria.
Generate exactly ${cardCount} flashcard question-answer pairs about: "${topic.trim()}".

Rules:
- Questions should be clear and specific
- Answers should be concise but complete (1-3 sentences max)
- Cover different aspects of the topic
- Do NOT number the cards

Respond ONLY with a valid JSON object of this exact form, no markdown, no extra text:
{
  "cards": [
    { "question": "...", "answer": "..." },
    ...
  ]
}`;

            messages = [{ role: 'user', content: prompt }];
            completionOptions = {
                model, messages, temperature: 0.7, max_tokens: 2000,
                response_format: { type: 'json_object' }
            };
        }

        const completion = await client.chat.completions.create(completionOptions);
        const raw = completion.choices[0]?.message?.content?.trim() || '';

        const cards = extractCards(raw);
        if (!cards) {
            return res.status(500).json({
                success: false,
                data: null,
                error: { code: 'AI_PARSE_ERROR', message: 'AI returned an unexpected format.', details: { raw } }
            });
        }

        const validated = cards
            .filter(c => c && typeof c.question === 'string' && typeof c.answer === 'string')
            .map(c => ({ question: c.question.trim(), answer: c.answer.trim() }));

        res.status(200).json({
            success: true,
            data: {
                topic: hasTopic ? topic.trim() : 'Image Analysis',
                cards: validated
            },
            error: null
        });
    } catch (error) {
        const isAuthError = error?.status === 401;
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

const evaluateAnswer = async (req, res) => {
    try {
        const { userAnswer, correctAnswer } = req.body;

        if (!userAnswer || !correctAnswer) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: 'VALIDATION_ERROR', message: '"userAnswer" and "correctAnswer" are required.', details: {} }
            });
        }

        const client = getClient();
        if (!client) {
            const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const correct = normalize(userAnswer) === normalize(correctAnswer);
            return res.status(200).json({
                success: true,
                data: { correct, feedback: correct ? 'Exact match.' : 'No AI configured — compare manually.' },
                error: null
            });
        }

        const prompt = `You are grading a flashcard answer.
Correct answer: "${correctAnswer.trim()}"
Student's answer: "${userAnswer.trim()}"

Mark as correct if the student captures the core concept, even with different wording or synonyms.
Reply ONLY with a valid JSON object, no extra text:
{ "correct": true or false, "feedback": "one short sentence explaining why" }`;

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 120,
            response_format: { type: 'json_object' }
        });

        const raw = completion.choices[0]?.message?.content?.trim() || '';

        let result;
        try {
            result = JSON.parse(raw);
            if (typeof result.correct !== 'boolean') throw new Error();
        } catch {
            return res.status(500).json({
                success: false,
                data: null,
                error: { code: 'AI_PARSE_ERROR', message: 'AI returned an unexpected format.', details: { raw } }
            });
        }

        res.status(200).json({
            success: true,
            data: { correct: result.correct, feedback: result.feedback || '' },
            error: null
        });
    } catch (error) {
        const isAuthError = error?.status === 401;
        res.status(isAuthError ? 401 : 500).json({
            success: false,
            data: null,
            error: {
                code: isAuthError ? 'INVALID_API_KEY' : 'SERVER_ERROR',
                message: isAuthError ? 'The AI API key is invalid or expired.' : 'An unexpected error occurred.',
                details: {}
            }
        });
    }
};

module.exports = { generateCards, evaluateAnswer };
