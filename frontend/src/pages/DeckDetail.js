import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import StudySession from '../components/StudySession';
import Table from '../components/Table';
import { getCardsByDeck, createCard, deleteCard, deleteDeck } from '../services/dashboardService';
import './DeckDetail.css';

const DeckDetail = ({ user }) => {
    const { deckId } = useParams();
    const { state }  = useLocation();
    const navigate   = useNavigate();
    const cardsRef   = useRef(null);

    const deck = {
        id:      parseInt(deckId),
        title:   state?.deck?.title   || `Deck #${deckId}`,
        subject: state?.deck?.subject || '',
    };

    const [cards, setCards]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [deleteError, setDeleteError] = useState('');

    const [showForm, setShowForm]     = useState(false);
    const [question, setQuestion]     = useState('');
    const [answer, setAnswer]         = useState('');
    const [formError, setFormError]   = useState('');
    const [creating, setCreating]     = useState(false);

    const [studyActive, setStudyActive]         = useState(false);
    const [revealAnyway, setRevealAnyway]       = useState(false);

    useEffect(() => {
        getCardsByDeck(deckId)
            .then(data => setCards(data))
            .catch(() => setError('Failed to load cards.'))
            .finally(() => setLoading(false));
    }, [deckId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!question.trim() || !answer.trim()) return;
        setCreating(true); setFormError('');
        try {
            const newCard = await createCard(deckId, question.trim(), answer.trim());
            setCards(p => [...p, newCard]);
            setQuestion(''); setAnswer(''); setShowForm(false);
        } catch (err) {
            setFormError(err.response?.data?.error?.message || 'Failed to create card.');
        } finally { setCreating(false); }
    };

    const handleDeleteCard = async (cardId) => {
        if (!window.confirm('Delete this flashcard?')) return;
        setDeleteError('');
        try {
            await deleteCard(deckId, cardId);
            setCards(p => p.filter(c => String(c.id) !== String(cardId)));
        } catch (err) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete card.');
        }
    };

    const handleDeleteDeck = async () => {
        if (!window.confirm(`Delete "${deck.title}" and all its cards? This cannot be undone.`)) return;
        try {
            await deleteDeck(deckId);
            navigate('/dashboard', { state: { deletedDeckId: parseInt(deckId) } });
        } catch (err) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete deck.');
        }
    };

    const tableColumns = [
        { key: 'question', header: 'Question', render: r => <span className="dd-q">{r.question}</span> },
        { key: 'answer',   header: 'Answer',   render: r => <span className="dd-a">{r.answer}</span> },
        { key: 'del',      header: '',         render: r => (
            <button className="dd-del" onClick={() => handleDeleteCard(r.id)} title="Delete">🗑️</button>
        )},
    ];

    return (
        <div className="dd-page">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="dd-header">
                <button className="dd-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                <div className="dd-header-center">
                    <h1 className="dd-title">{deck.title}</h1>
                    {deck.subject && <span className="dd-subject">{deck.subject}</span>}
                </div>
                <div className="dd-header-right">
                    <span className="dd-card-count">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
                    <button className="dd-delete-deck" onClick={handleDeleteDeck}>🗑️ Delete Deck</button>
                </div>
            </div>

            {/* ── Study Session ───────────────────────────────────────────── */}
            <section className="dd-section">
                <h2 className="dd-section-title">Study Session</h2>
                <StudySession
                    deck={deck}
                    username={user?.username || user?.firstName || 'Anonymous'}
                    onActiveChange={active => { setStudyActive(active); if (active) setRevealAnyway(false); }}
                />
            </section>

            {/* ── Cards ──────────────────────────────────────────────────── */}
            <section className="dd-section" ref={cardsRef}>
                <div className="dd-section-hdr">
                    <h2 className="dd-section-title">
                        Cards
                        {!loading && <span className="dd-badge">{cards.length}</span>}
                    </h2>
                    <button
                        className="dd-btn dd-btn--primary"
                        onClick={() => { setShowForm(v => !v); setFormError(''); }}
                    >
                        {showForm ? 'Cancel' : '+ New Card'}
                    </button>
                </div>

                {showForm && (
                    <form className="dd-form" onSubmit={handleCreate}>
                        <input className="dd-input" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} disabled={creating} />
                        <input className="dd-input" placeholder="Answer"   value={answer}   onChange={e => setAnswer(e.target.value)}   disabled={creating} />
                        <button className="dd-btn dd-btn--success" type="submit" disabled={creating || !question.trim() || !answer.trim()}>
                            {creating ? 'Creating…' : 'Create'}
                        </button>
                        {formError && <p className="dd-form-error">{formError}</p>}
                    </form>
                )}

                {deleteError && <p className="dd-error">{deleteError}</p>}

                {loading ? (
                    <div className="dd-loading">Loading cards…</div>
                ) : error ? (
                    <p className="dd-error">{error}</p>
                ) : studyActive && !revealAnyway ? (
                    <div className="dd-hidden">
                        <p>🙈 Cards are hidden during your study session.</p>
                        <button className="dd-btn dd-btn--ghost" onClick={() => setRevealAnyway(true)}>Show anyway</button>
                    </div>
                ) : (
                    <Table columns={tableColumns} rows={cards} emptyMessage="No cards yet. Add one above!" />
                )}
            </section>

        </div>
    );
};

export default DeckDetail;
