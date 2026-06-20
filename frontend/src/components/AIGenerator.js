import React, { useState } from 'react';
import api from '../services/api';
import './AIGenerator.css';

/**
 * AIGenerator – lets the user describe a topic, calls POST /api/ai/generate-cards,
 * then shows a preview of the generated flashcards.
 */
const AIGenerator = () => {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedCards, setGeneratedCards] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setError('');
        setGeneratedCards(null);

        try {
            const res = await api.post('/ai/generate-cards', { topic: topic.trim(), count });
            setGeneratedCards(res.data.data);
        } catch (err) {
            setError(
                err.response?.data?.error?.message ||
                'Failed to generate cards. Make sure AI_API_KEY is set in the backend .env file.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-generator">
            <div className="ai-generator-header">
                <span className="ai-generator-icon">🤖</span>
                <div>
                    <h3 className="ai-generator-title">AI Card Generator</h3>
                    <p className="ai-generator-subtitle">Describe a topic and let AI create flashcards for you.</p>
                </div>
            </div>

            <form className="ai-generator-form" onSubmit={handleGenerate}>
                <input
                    className="ai-generator-input"
                    type="text"
                    placeholder="e.g. The French Revolution, React Hooks, SQL JOINs…"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={loading}
                />
                <div className="ai-generator-row">
                    <label className="ai-generator-label">
                        Cards:
                        <select
                            className="ai-generator-select"
                            value={count}
                            onChange={(e) => setCount(Number(e.target.value))}
                            disabled={loading}
                        >
                            {[3, 5, 8, 10, 15, 20].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </label>
                    <button className="ai-generator-btn" type="submit" disabled={loading || !topic.trim()}>
                        {loading ? 'Generating…' : 'Generate ✨'}
                    </button>
                </div>
            </form>

            {error && <p className="ai-generator-error">{error}</p>}

            {generatedCards && (
                <div className="ai-generator-results">
                    <div className="ai-generator-results-header">
                        <span className="ai-generator-results-title">
                            ✅ {generatedCards.cards.length} cards generated for "{generatedCards.topic}"
                        </span>
                    </div>
                    <div className="ai-generator-cards">
                        {generatedCards.cards.map((card, i) => (
                            <div key={i} className="ai-generator-card">
                                <div className="ai-generator-card-q">
                                    <span className="ai-generator-card-label">Q</span>
                                    {card.question}
                                </div>
                                <div className="ai-generator-card-a">
                                    <span className="ai-generator-card-label ai-generator-card-label--a">A</span>
                                    {card.answer}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIGenerator;
