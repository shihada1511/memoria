import React, { useState, useRef } from 'react';
import api from '../services/api';
import { createCard } from '../services/dashboardService';
import './AIGenerator.css';

/**
 * AIGenerator – lets the user describe a topic and/or upload an image,
 * calls POST /api/ai/generate-cards, shows a preview of generated flashcards,
 * and lets them save selected cards into one of their decks.
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

    const [imageBase64, setImageBase64] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const [selectedDeckId, setSelectedDeckId] = useState('');
    const [selectedCards, setSelectedCards] = useState(new Set());
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');

    const handleImageFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file (JPEG, PNG, WebP).');
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            setUploadError('Image must be smaller than 4 MB.');
            return;
        }
        setUploadError('');
        const reader = new FileReader();
        reader.onload = (e) => { setImageBase64(e.target.result); setImagePreview(e.target.result); };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setImageBase64(''); setImagePreview(''); setUploadError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setError('');

        if (!topic.trim() && !imageBase64) {
            setError('Please enter a topic or upload an image before generating.');
            return;
        }
        if (topic.trim() && topic.trim().length < 3) {
            setError('Topic is too short — please enter at least 3 characters.');
            return;
        }

        setLoading(true);
        setUploadError('');
        setAddError('');
        setAddSuccess('');
        setGeneratedCards(null);

        try {
            const payload = { count };
            if (topic.trim()) payload.topic = topic.trim();
            if (imageBase64)  payload.imageBase64 = imageBase64;

            const res = await api.post('/ai/generate-cards', payload);
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
        setAddError('');
        if (!selectedDeckId) {
            setAddError('Please select a deck to add the cards to.');
            return;
        }
        if (selectedCards.size === 0) {
            setAddError('Please select at least one card to add.');
            return;
        }

        setAdding(true);
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
                    <p className="ai-generator-subtitle">Type a topic or upload an image — AI builds the cards.</p>
                </div>
            </div>

            <form className="ai-generator-form" onSubmit={handleGenerate}>
                <input
                    className="ai-generator-input"
                    type="text"
                    placeholder={imageBase64 ? 'Optional: describe focus area…' : 'e.g. React Hooks, Eurocode 3, Geomechanics…'}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={loading}
                />

                <div className="ai-divider">or upload an image</div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageFile(e.target.files[0])}
                />

                {/* Upload / preview area */}
                <div
                    className={`ai-upload-area${isDragOver ? ' ai-upload-area--over' : ''}${imagePreview ? ' ai-upload-area--filled' : ''}`}
                    onClick={() => !imagePreview && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleImageFile(e.dataTransfer.files[0]); }}
                >
                    {imagePreview ? (
                        <div className="ai-preview">
                            <img src={imagePreview} alt="Upload preview" className="ai-preview-img" />
                            <button
                                type="button"
                                className="ai-preview-clear"
                                onClick={(e) => { e.stopPropagation(); clearImage(); }}
                                title="Remove image"
                            >✕</button>
                        </div>
                    ) : (
                        <div className="ai-upload-placeholder">
                            <span className="ai-upload-icon">📷</span>
                            <span className="ai-upload-text">Click to upload or drag & drop</span>
                            <span className="ai-upload-hint">JPEG · PNG · WebP · max 4 MB</span>
                        </div>
                    )}
                </div>
                {uploadError && <p className="ai-upload-error">{uploadError}</p>}

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
                    <button className="ai-generator-btn" type="submit" disabled={loading}>
                        {loading ? 'Generating…' : 'Generate ✨'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="ai-generator-error-box">
                    ⚠️ {error}
                </div>
            )}
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
                                    disabled={adding}
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
