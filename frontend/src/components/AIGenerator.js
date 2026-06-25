import React, { useState } from 'react';
import api from '../services/api';
import { createCard } from '../services/dashboardService';
import './AIGenerator.css';

/**
 * AIGenerator – lets the user describe a topic, calls POST /api/ai/generate-cards,
 * shows a preview of the generated flashcards, and lets them save selected
 * cards into one of their decks.
 *
 * Props:
 *   decks         array of { id|deckId, title }
 *   onCardsAdded  (deckId, createdCards[]) => void
 */
const AIGenerator = ({ decks = [], onCardsAdded }) => {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedCards, setGeneratedCards] = useState(null);

    const [selectedDeckId, setSelectedDeckId] = useState('');
    const [selectedCards, setSelectedCards] = useState(new Set());
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setError('');
        setAddError('');
        setAddSuccess('');
        setGeneratedCards(null);

        try {
            const res = await api.post('/ai/generate-cards', { topic: topic.trim(), count });
            setGeneratedCards(res.data.data);
            setSelectedCards(new Set(res.data.data.cards.map((_, i) => i)));
            setSelectedDeckId(String(decks[0]?.id ?? decks[0]?.deckId ?? ''));
        } catch (err) {
            setError(
                err.response?.data?.error?.message ||
                'Failed to generate cards. Make sure AI_API_KEY is set in the backend .env file.'
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleCard = (index) => {
        setSelectedCards((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleAddToDeck = async () => {
        if (!selectedDeckId || selectedCards.size === 0) return;

        setAdding(true);
        setAddError('');
        setAddSuccess('');
        try {
            const cardsToAdd = generatedCards.cards.filter((_, i) => selectedCards.has(i));
            const created = await Promise.all(
                cardsToAdd.map((c) => createCard(selectedDeckId, c.question, c.answer))
            );
            onCardsAdded?.(selectedDeckId, created);
            setAddSuccess(`Added ${created.length} card${created.length === 1 ? '' : 's'} to your deck!`);
            setGeneratedCards(null);
            setSelectedCards(new Set());
        } catch (err) {
            setAddError(err.response?.data?.error?.message || 'Failed to add cards to deck.');
        } finally {
            setAdding(false);
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
            {addSuccess && <p className="ai-generator-success">{addSuccess}</p>}

            {generatedCards && (
                <div className="ai-generator-results">
                    <div className="ai-generator-results-header">
                        <span className="ai-generator-results-title">
                            ✅ {generatedCards.cards.length} cards generated for "{generatedCards.topic}"
                        </span>
                    </div>

                    <div className="ai-generator-cards">
                        {generatedCards.cards.map((card, i) => (
                            <label key={i} className="ai-generator-card ai-generator-card-selectable">
                                <input
                                    type="checkbox"
                                    className="ai-generator-card-checkbox"
                                    checked={selectedCards.has(i)}
                                    onChange={() => toggleCard(i)}
                                />
                                <div className="ai-generator-card-content">
                                    <div className="ai-generator-card-q">
                                        <span className="ai-generator-card-label">Q</span>
                                        {card.question}
                                    </div>
                                    <div className="ai-generator-card-a">
                                        <span className="ai-generator-card-label ai-generator-card-label--a">A</span>
                                        {card.answer}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="ai-generator-add-row">
                        {decks.length === 0 ? (
                            <p className="ai-generator-hint">Create a deck first to save these cards.</p>
                        ) : (
                            <>
                                <select
                                    className="ai-generator-select ai-generator-deck-select"
                                    value={selectedDeckId}
                                    onChange={(e) => setSelectedDeckId(e.target.value)}
                                    disabled={adding}
                                >
                                    {decks.map((d) => (
                                        <option key={d.id ?? d.deckId} value={d.id ?? d.deckId}>{d.title}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="ai-generator-btn"
                                    onClick={handleAddToDeck}
                                    disabled={adding || selectedCards.size === 0}
                                >
                                    {adding ? 'Adding…' : `Add ${selectedCards.size} to deck`}
                                </button>
                            </>
                        )}
                    </div>
                    {addError && <p className="ai-generator-error">{addError}</p>}
                </div>
            )}
        </div>
    );
};

export default AIGenerator;
