import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/Table';
import StudySession from '../components/StudySession';
import AIGenerator from '../components/AIGenerator';
import CalendarWidget from '../components/CalendarWidget';
import { getDecks, getCardsByDeck, createDeck, createCard, deleteDeck, deleteCard } from '../services/dashboardService';
import { getStats } from '../services/statsService';
import './Dashboard.css';

const ACCENTS = ['blue', 'purple', 'green', 'amber'];

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const todayLabel = () =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const studyRef = useRef(null);

    const [decks, setDecks] = useState([]);
    const [cards, setCards] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeDeck, setActiveDeck] = useState(null);
    const [studySessionActive, setStudySessionActive] = useState(false);
    const [revealCardsAnyway, setRevealCardsAnyway] = useState(false);

    const [showDeckForm, setShowDeckForm] = useState(false);
    const [deckTitle, setDeckTitle] = useState('');
    const [deckSubject, setDeckSubject] = useState('');
    const [deckFormError, setDeckFormError] = useState('');
    const [creatingDeck, setCreatingDeck] = useState(false);

    const [showCardForm, setShowCardForm] = useState(false);
    const [cardDeckId, setCardDeckId] = useState('');
    const [cardQuestion, setCardQuestion] = useState('');
    const [cardAnswer, setCardAnswer] = useState('');
    const [cardFormError, setCardFormError] = useState('');
    const [creatingCard, setCreatingCard] = useState(false);

    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [deckList, statsData] = await Promise.all([getDecks(), getStats().catch(() => null)]);
                if (cancelled) return;
                setDecks(deckList);
                setStats(statsData);

                const cardLists = await Promise.all(
                    deckList.map(async (deck, i) => {
                        const dc = await getCardsByDeck(deck.id ?? deck.deckId);
                        return dc.map(c => ({ ...c, deckTitle: deck.title, deckAccent: ACCENTS[i % ACCENTS.length] }));
                    })
                );
                if (!cancelled) {
                    setCards(cardLists.flat());
                    if (deckList.length > 0) setActiveDeck({ id: deckList[0].id ?? deckList[0].deckId, title: deckList[0].title });
                }
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load dashboard.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cardCountByDeck = useMemo(() => {
        const m = {};
        cards.forEach(c => { m[String(c.deckId)] = (m[String(c.deckId)] || 0) + 1; });
        return m;
    }, [cards]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = stats?.heatmap?.find(h => h.date === todayStr)?.count ?? 0;

    const handleStudyDeck = (deck) => {
        setActiveDeck({ id: deck.id ?? deck.deckId, title: deck.title });
        setTimeout(() => studyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const handleCreateDeck = async (e) => {
        e.preventDefault();
        if (!deckTitle.trim() || !deckSubject.trim()) return;
        setCreatingDeck(true); setDeckFormError('');
        try {
            const { deckId } = await createDeck(user.userId, deckTitle.trim(), deckSubject.trim());
            const nd = { id: deckId, title: deckTitle.trim(), subject: deckSubject.trim(), createdAt: new Date().toISOString() };
            setDecks(p => [...p, nd]);
            if (!activeDeck) setActiveDeck({ id: deckId, title: nd.title });
            setDeckTitle(''); setDeckSubject(''); setShowDeckForm(false);
        } catch (err) {
            setDeckFormError(err.response?.data?.error?.message || 'Failed to create deck.');
        } finally { setCreatingDeck(false); }
    };

    const handleCreateCard = async (e) => {
        e.preventDefault();
        const tid = cardDeckId || activeDeck?.id;
        if (!tid || !cardQuestion.trim() || !cardAnswer.trim()) return;
        setCreatingCard(true); setCardFormError('');
        try {
            const newCard = await createCard(tid, cardQuestion.trim(), cardAnswer.trim());
            const di = decks.findIndex(d => String(d.id ?? d.deckId) === String(tid));
            const deck = di >= 0 ? decks[di] : null;
            setCards(p => [...p, { ...newCard, deckTitle: deck?.title, deckAccent: ACCENTS[(di >= 0 ? di : 0) % ACCENTS.length] }]);
            setCardQuestion(''); setCardAnswer(''); setShowCardForm(false);
        } catch (err) {
            setCardFormError(err.response?.data?.error?.message || 'Failed to create card.');
        } finally { setCreatingCard(false); }
    };

    const handleDeleteDeck = async (id) => {
        if (!window.confirm('Delete this deck and all its cards?')) return;
        setDeleteError('');
        try {
            await deleteDeck(id);
            const remaining = decks.filter(d => String(d.id ?? d.deckId) !== String(id));
            setDecks(remaining);
            setCards(p => p.filter(c => String(c.deckId) !== String(id)));
            if (activeDeck && String(activeDeck.id) === String(id))
                setActiveDeck(remaining[0] ? { id: remaining[0].id ?? remaining[0].deckId, title: remaining[0].title } : null);
        } catch (err) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete deck.');
        }
    };

    const handleDeleteCard = async (deckId, cardId) => {
        if (!window.confirm('Delete this flashcard?')) return;
        setDeleteError('');
        try {
            await deleteCard(deckId, cardId);
            setCards(p => p.filter(c => String(c.id) !== String(cardId)));
        } catch (err) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete card.');
        }
    };

    const handleAICardsAdded = (deckId, newCards) => {
        const di = decks.findIndex(d => String(d.id ?? d.deckId) === String(deckId));
        const deck = di >= 0 ? decks[di] : null;
        setCards(p => [...p, ...newCards.map(c => ({ ...c, deckTitle: deck?.title, deckAccent: ACCENTS[(di >= 0 ? di : 0) % ACCENTS.length] }))]);
    };

    const tableColumns = [
        { key: 'question', header: 'Question', render: r => <span className="db-q">{r.question}</span> },
        { key: 'answer',   header: 'Answer',   render: r => <span className="db-a">{r.answer}</span> },
        { key: 'deck',     header: 'Deck',     render: r => <span className={`db-badge db-badge--${r.deckAccent}`}>{r.deckTitle}</span> },
        { key: 'del',      header: '',         render: r => (
            <button className="db-del-btn db-del-btn--sm" onClick={() => handleDeleteCard(r.deckId, r.id)} title="Delete">🗑️</button>
        )},
    ];

    return (
        <div className="db-page">

            {/* ── Greeting banner ────────────────────────────────────────── */}
            <div className="db-hero">
                <div className="db-hero-left">
                    <p className="db-hero-greeting">{greeting()},</p>
                    <h1 className="db-hero-name">{user?.firstName ?? 'there'} 👋</h1>
                    <p className="db-hero-date">{todayLabel()}</p>
                </div>
                {stats?.streak > 0 && (
                    <div className="db-streak-pill">
                        <span className="db-streak-fire">🔥</span>
                        <div>
                            <div className="db-streak-num">{stats.streak}</div>
                            <div className="db-streak-lbl">day streak</div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Quick stats strip ──────────────────────────────────────── */}
            {!loading && !error && (
                <div className="db-pills">
                    <div className="db-pill">
                        <span className="db-pill-icon">📅</span>
                        <span className="db-pill-val">{todayCount}</span>
                        <span className="db-pill-lbl">Today</span>
                    </div>
                    <div className="db-pill">
                        <span className="db-pill-icon">🗂️</span>
                        <span className="db-pill-val">{decks.length}</span>
                        <span className="db-pill-lbl">Decks</span>
                    </div>
                    <div className="db-pill">
                        <span className="db-pill-icon">🃏</span>
                        <span className="db-pill-val">{cards.length}</span>
                        <span className="db-pill-lbl">Cards</span>
                    </div>
                    <div className="db-pill">
                        <span className="db-pill-icon">🎯</span>
                        <span className="db-pill-val">{stats?.overallRate ?? 0}%</span>
                        <span className="db-pill-lbl">Accuracy</span>
                    </div>
                    <button className="db-pill db-pill--link" onClick={() => navigate('/study')}>
                        <span className="db-pill-icon">📊</span>
                        <span className="db-pill-val db-pill-val--sm">Full Stats</span>
                    </button>
                </div>
            )}

            {loading && <div className="db-loading">Loading…</div>}
            {!loading && error && <p className="db-error">{error}</p>}
            {deleteError && <p className="db-error">{deleteError}</p>}

            {!loading && !error && (
                <div className="db-body">

                    {/* ── Left column ───────────────────────────────────── */}
                    <div className="db-main">

                        {/* Decks */}
                        <div className="db-section-hdr">
                            <h2>My Decks</h2>
                            <button className="db-btn db-btn--primary" onClick={() => { setShowDeckForm(v => !v); setDeckFormError(''); }}>
                                {showDeckForm ? 'Cancel' : '+ New Deck'}
                            </button>
                        </div>

                        {showDeckForm && (
                            <form className="db-form" onSubmit={handleCreateDeck}>
                                <input className="db-input" placeholder="Deck title" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} disabled={creatingDeck} />
                                <input className="db-input" placeholder="Subject" value={deckSubject} onChange={e => setDeckSubject(e.target.value)} disabled={creatingDeck} />
                                <button className="db-btn db-btn--success" type="submit" disabled={creatingDeck || !deckTitle.trim() || !deckSubject.trim()}>
                                    {creatingDeck ? 'Creating…' : 'Create'}
                                </button>
                                {deckFormError && <p className="db-form-error">{deckFormError}</p>}
                            </form>
                        )}

                        {decks.length === 0 ? (
                            <div className="db-empty">No decks yet. Create one to get started!</div>
                        ) : (
                            <div className="db-deck-grid">
                                {decks.map((deck, i) => {
                                    const id = deck.id ?? deck.deckId;
                                    const count = cardCountByDeck[String(id)] ?? 0;
                                    const isActive = activeDeck && String(activeDeck.id) === String(id);
                                    return (
                                        <div key={id} className={`db-deck-card db-deck-card--${ACCENTS[i % ACCENTS.length]} ${isActive ? 'db-deck-card--active' : ''}`}>
                                            <div className="db-deck-card-top">
                                                <span className="db-deck-icon">📚</span>
                                                <div className="db-deck-info">
                                                    <div className="db-deck-title">{deck.title}</div>
                                                    <div className="db-deck-subject">{deck.subject}</div>
                                                </div>
                                            </div>
                                            <div className="db-deck-count">{count} card{count !== 1 ? 's' : ''}</div>
                                            <div className="db-deck-actions">
                                                <button className="db-btn db-btn--study" onClick={() => handleStudyDeck(deck)}>
                                                    ▶ Study
                                                </button>
                                                <button className="db-del-btn" onClick={() => handleDeleteDeck(id)}>🗑️</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Study Session */}
                        {activeDeck && (
                            <div ref={studyRef}>
                                <div className="db-section-hdr">
                                    <h2>Study Session</h2>
                                    {decks.length > 1 && (
                                        <select className="db-select" value={activeDeck.id} onChange={e => {
                                            const d = decks.find(d => String(d.id ?? d.deckId) === e.target.value);
                                            if (d) setActiveDeck({ id: d.id ?? d.deckId, title: d.title });
                                        }}>
                                            {decks.map(d => <option key={d.id ?? d.deckId} value={d.id ?? d.deckId}>{d.title}</option>)}
                                        </select>
                                    )}
                                </div>
                                <StudySession
                                    deck={activeDeck}
                                    username={user?.username || user?.firstName || 'Anonymous'}
                                    onActiveChange={active => { setStudySessionActive(active); if (active) setRevealCardsAnyway(false); }}
                                />
                            </div>
                        )}

                        {/* Flashcards */}
                        <div className="db-section-hdr" style={{ marginTop: 32 }}>
                            <h2>Flashcards <span className="db-count">{cards.length}</span></h2>
                            <button
                                className="db-btn db-btn--primary"
                                disabled={decks.length === 0}
                                onClick={() => {
                                    setShowCardForm(v => !v); setCardFormError('');
                                    setCardDeckId(String(activeDeck?.id ?? decks[0]?.id ?? ''));
                                }}
                            >
                                {showCardForm ? 'Cancel' : '+ New Card'}
                            </button>
                        </div>

                        {showCardForm && (
                            <form className="db-form" onSubmit={handleCreateCard}>
                                <select className="db-input" value={cardDeckId} onChange={e => setCardDeckId(e.target.value)} disabled={creatingCard}>
                                    {decks.map(d => <option key={d.id ?? d.deckId} value={d.id ?? d.deckId}>{d.title}</option>)}
                                </select>
                                <input className="db-input" placeholder="Question" value={cardQuestion} onChange={e => setCardQuestion(e.target.value)} disabled={creatingCard} />
                                <input className="db-input" placeholder="Answer" value={cardAnswer} onChange={e => setCardAnswer(e.target.value)} disabled={creatingCard} />
                                <button className="db-btn db-btn--success" type="submit" disabled={creatingCard || !cardDeckId || !cardQuestion.trim() || !cardAnswer.trim()}>
                                    {creatingCard ? 'Creating…' : 'Create'}
                                </button>
                                {cardFormError && <p className="db-form-error">{cardFormError}</p>}
                            </form>
                        )}

                        {studySessionActive && !revealCardsAnyway ? (
                            <div className="db-hidden-cards">
                                <p>🙈 Cards hidden during study session.</p>
                                <button className="db-btn db-btn--ghost" onClick={() => setRevealCardsAnyway(true)}>Show anyway</button>
                            </div>
                        ) : (
                            <Table columns={tableColumns} rows={cards} emptyMessage="No flashcards yet." />
                        )}

                        {/* AI Generator */}
                        <div className="db-section-hdr" style={{ marginTop: 32 }}>
                            <h2>AI Card Generator</h2>
                        </div>
                        <AIGenerator decks={decks} onCardsAdded={handleAICardsAdded} />
                    </div>

                    {/* ── Sidebar ───────────────────────────────────────── */}
                    <div className="db-sidebar">
                        <CalendarWidget data={stats?.heatmap || []} />

                        <div className="db-sidebar-stats">
                            <div className="db-sstat">
                                <span className="db-sstat-icon">🔥</span>
                                <div>
                                    <div className="db-sstat-val">{stats?.streak ?? 0}</div>
                                    <div className="db-sstat-lbl">Current Streak</div>
                                </div>
                            </div>
                            <div className="db-sstat">
                                <span className="db-sstat-icon">⚡</span>
                                <div>
                                    <div className="db-sstat-val">{stats?.longestStreak ?? 0}</div>
                                    <div className="db-sstat-lbl">Best Streak</div>
                                </div>
                            </div>
                            <div className="db-sstat">
                                <span className="db-sstat-icon">📚</span>
                                <div>
                                    <div className="db-sstat-val">{(stats?.totalCards ?? 0).toLocaleString()}</div>
                                    <div className="db-sstat-lbl">Total Studied</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
