import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/Table';
import StudySession from '../components/StudySession';
import AIGenerator from '../components/AIGenerator';
import SmartCalendar from '../components/SmartCalendar';
import MasteryFunnel from '../components/MasteryFunnel';
import { getDecks, getCardsByDeck, createDeck, createCard, deleteDeck, deleteCard } from '../services/dashboardService';
import { getStats, getDashboardStats } from '../services/statsService';
import './Dashboard.css';

const ACCENTS = ['blue', 'purple', 'green', 'amber'];

const EXAM_KEY = 'memoria_exam';

const loadExam = () => {
    try { return JSON.parse(localStorage.getItem(EXAM_KEY)) || null; } catch { return null; }
};
const saveExam = (date, name) => {
    if (!date) { localStorage.removeItem(EXAM_KEY); }
    else        { localStorage.setItem(EXAM_KEY, JSON.stringify({ date, name })); }
};

const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const studyRef = useRef(null);

    const [decks, setDecks] = useState([]);
    const [cards, setCards] = useState([]);
    const [stats, setStats]                     = useState(null);
    const [dashboardStats, setDashboardStats]   = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState('');

    const [activeDeck, setActiveDeck]               = useState(null);
    const [studySessionActive, setStudySessionActive] = useState(false);
    const [revealCardsAnyway, setRevealCardsAnyway] = useState(false);

    const [showDeckForm, setShowDeckForm]       = useState(false);
    const [deckTitle, setDeckTitle]             = useState('');
    const [deckSubject, setDeckSubject]         = useState('');
    const [deckFormError, setDeckFormError]     = useState('');
    const [creatingDeck, setCreatingDeck]       = useState(false);

    const [showCardForm, setShowCardForm]       = useState(false);
    const [cardDeckId, setCardDeckId]           = useState('');
    const [cardQuestion, setCardQuestion]       = useState('');
    const [cardAnswer, setCardAnswer]           = useState('');
    const [cardFormError, setCardFormError]     = useState('');
    const [creatingCard, setCreatingCard]       = useState(false);

    const [deleteError, setDeleteError] = useState('');

    // Exam target
    const savedExam = useMemo(() => loadExam(), []);
    const [examDate, setExamDate] = useState(savedExam?.date || null);
    const [examName, setExamName] = useState(savedExam?.name || '');

    const handleExamSet = (date, name) => {
        setExamDate(date || null);
        setExamName(name || '');
        saveExam(date, name);
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true); setError('');
            try {
                const [deckList, statsData, dsData] = await Promise.all([
                    getDecks(),
                    getStats().catch(() => null),
                    getDashboardStats().catch(() => null)
                ]);
                if (cancelled) return;
                setDecks(deckList);
                setStats(statsData);
                setDashboardStats(dsData);

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

    // Exam countdown banner math
    const examBanner = useMemo(() => {
        if (!examDate || !examName || !dashboardStats) return null;
        const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime();
        const examMs  = new Date(examDate + 'T00:00:00').getTime();
        const daysLeft = Math.round((examMs - todayMs) / 86400000);
        if (daysLeft <= 0) return null;
        const { mastery } = dashboardStats;
        const unmastered = (mastery?.new || 0) + (mastery?.learning || 0) + (mastery?.familiar || 0);
        const perDay = Math.max(1, Math.ceil(unmastered / daysLeft));
        return { daysLeft, perDay, unmastered };
    }, [examDate, examName, dashboardStats]);

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

    const dueToday = dashboardStats?.dueToday ?? null;
    const firstName = user?.firstName ?? 'there';

    return (
        <div className="db-page">

            {/* ── Exam countdown banner ──────────────────────────────────── */}
            {examBanner && (
                <div className="db-exam-banner">
                    <span>
                        📅 <strong>{examBanner.daysLeft} day{examBanner.daysLeft !== 1 ? 's' : ''}</strong> until <strong>{examName}</strong>.
                        {' '}Study <strong>{examBanner.perDay} card{examBanner.perDay !== 1 ? 's' : ''}/day</strong> to reach 100% mastery.
                        {' '}<span className="db-exam-unmastered">({examBanner.unmastered} cards left to master)</span>
                    </span>
                    <button className="db-exam-dismiss" onClick={() => handleExamSet(null, null)} title="Remove exam">✕</button>
                </div>
            )}

            {/* ── Home grid ─────────────────────────────────────────────── */}
            <div className="db-home-grid">

                {/* Top-left (2×1): Welcome widget */}
                <div className="db-widget db-widget--welcome">
                    <div className="db-welcome-text">
                        <p className="db-welcome-sub">Welcome back,</p>
                        <h1 className="db-welcome-name">{firstName}.</h1>
                        <p className="db-welcome-due">
                            {dueToday === null
                                ? 'Loading your cards…'
                                : dueToday === 0
                                    ? "You're all caught up! 🎉"
                                    : <>You have <strong>{dueToday} card{dueToday !== 1 ? 's' : ''}</strong> due today.</>
                            }
                        </p>
                    </div>
                    <button
                        className="db-welcome-btn"
                        onClick={() => studyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        disabled={!activeDeck}
                    >
                        ▶ Start Session
                    </button>
                </div>

                {/* Top-right (1×1): Streak widget */}
                <div className="db-widget db-widget--streak">
                    <span className="db-streak-emoji">{(stats?.streak ?? 0) > 0 ? '🔥' : '💤'}</span>
                    <div className="db-streak-num">{stats?.streak ?? 0}</div>
                    <div className="db-streak-lbl">Day Streak</div>
                    {stats?.longestStreak > 0 && (
                        <div className="db-streak-best">Best: {stats.longestStreak}</div>
                    )}
                </div>

                {/* Bottom-left (2×2): Smart calendar */}
                <div className="db-widget db-widget--calendar">
                    <div className="db-widget-title">Study Calendar</div>
                    <SmartCalendar
                        heatmapData={stats?.heatmap || []}
                        forecastData={dashboardStats?.forecast || []}
                        examDate={examDate}
                        examName={examName}
                        onExamSet={handleExamSet}
                    />
                </div>

                {/* Bottom-right (1×2): Mastery funnel */}
                <div className="db-widget db-widget--funnel">
                    <MasteryFunnel data={dashboardStats?.mastery || null} />
                    {dashboardStats && (
                        <button className="db-funnel-link" onClick={() => navigate('/study')}>
                            Full Stats →
                        </button>
                    )}
                </div>

            </div>

            {/* ── Deck management & study ────────────────────────────────── */}
            {loading && <div className="db-loading">Loading…</div>}
            {!loading && error && <p className="db-error">{error}</p>}
            {deleteError && <p className="db-error">{deleteError}</p>}

            {!loading && !error && (
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
                                            <button className="db-btn db-btn--study" onClick={() => handleStudyDeck(deck)}>▶ Study</button>
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
            )}
        </div>
    );
};

export default Dashboard;
