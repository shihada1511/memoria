import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AIGenerator from '../components/AIGenerator';
import SmartCalendar from '../components/SmartCalendar';
import MasteryFunnel from '../components/MasteryFunnel';
import { getDecks, getCardsByDeck, createDeck, deleteDeck } from '../services/dashboardService';
import { getStats, getDashboardStats } from '../services/statsService';
import './Dashboard.css';

const ACCENTS = ['blue', 'purple', 'green', 'amber'];
const EXAM_KEY = 'memoria_exam';

const loadExam = () => { try { return JSON.parse(localStorage.getItem(EXAM_KEY)) || null; } catch { return null; } };
const saveExam = (date, name) => { date ? localStorage.setItem(EXAM_KEY, JSON.stringify({ date, name })) : localStorage.removeItem(EXAM_KEY); };

const Dashboard = ({ user }) => {
    const navigate  = useNavigate();
    const { state } = useLocation();

    const [decks, setDecks]                     = useState([]);
    const [cardCounts, setCardCounts]           = useState({});
    const [stats, setStats]                     = useState(null);
    const [dashboardStats, setDashboardStats]   = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState('');

    const [showDeckForm, setShowDeckForm]   = useState(false);
    const [deckTitle, setDeckTitle]         = useState('');
    const [deckSubject, setDeckSubject]     = useState('');
    const [deckFormError, setDeckFormError] = useState('');
    const [creatingDeck, setCreatingDeck]   = useState(false);
    const [deleteError, setDeleteError]     = useState('');

    const saved = useMemo(() => loadExam(), []);
    const [examDate, setExamDate] = useState(saved?.date || null);
    const [examName, setExamName] = useState(saved?.name || '');

    const handleExamSet = (date, name) => {
        setExamDate(date || null);
        setExamName(name || '');
        saveExam(date, name);
    };

    // Remove a deleted deck from state when returning from DeckDetail
    useEffect(() => {
        if (state?.deletedDeckId) {
            setDecks(p => p.filter(d => (d.id ?? d.deckId) !== state.deletedDeckId));
            setCardCounts(p => { const n = { ...p }; delete n[String(state.deletedDeckId)]; return n; });
            // Clear the location state so re-renders don't re-fire
            window.history.replaceState({}, '');
        }
    }, [state?.deletedDeckId]);

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

                // Fetch card counts (not the cards themselves — those live in DeckDetail)
                const counts = await Promise.all(
                    deckList.map(async deck => {
                        const dc = await getCardsByDeck(deck.id ?? deck.deckId).catch(() => []);
                        return { id: String(deck.id ?? deck.deckId), count: dc.length };
                    })
                );
                if (!cancelled) {
                    const m = {};
                    counts.forEach(({ id, count }) => { m[id] = count; });
                    setCardCounts(m);
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

    const handleCreateDeck = async (e) => {
        e.preventDefault();
        if (!deckTitle.trim() || !deckSubject.trim()) return;
        setCreatingDeck(true); setDeckFormError('');
        try {
            const { deckId } = await createDeck(user.userId, deckTitle.trim(), deckSubject.trim());
            const nd = { id: deckId, title: deckTitle.trim(), subject: deckSubject.trim() };
            setDecks(p => [...p, nd]);
            setCardCounts(p => ({ ...p, [String(deckId)]: 0 }));
            setDeckTitle(''); setDeckSubject(''); setShowDeckForm(false);
        } catch (err) {
            setDeckFormError(err.response?.data?.error?.message || 'Failed to create deck.');
        } finally { setCreatingDeck(false); }
    };

    const handleDeleteDeck = async (id) => {
        if (!window.confirm('Delete this deck and all its cards?')) return;
        setDeleteError('');
        try {
            await deleteDeck(id);
            setDecks(p => p.filter(d => String(d.id ?? d.deckId) !== String(id)));
            setCardCounts(p => { const n = { ...p }; delete n[String(id)]; return n; });
        } catch (err) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete deck.');
        }
    };

    const dueToday  = dashboardStats?.dueToday ?? null;
    const firstName = user?.firstName ?? 'there';
    const firstDeck = decks[0];

    return (
        <div className="db-page">

            {/* ── Exam countdown banner ──────────────────────────────────── */}
            {examBanner && (
                <div className="db-exam-banner">
                    <span>
                        📅 <strong>{examBanner.daysLeft} day{examBanner.daysLeft !== 1 ? 's' : ''}</strong> until <strong>{examName}</strong>.
                        {' '}Study <strong>{examBanner.perDay} card{examBanner.perDay !== 1 ? 's' : ''}/day</strong> to reach 100% mastery.
                        <span className="db-exam-unmastered"> ({examBanner.unmastered} cards left to master)</span>
                    </span>
                    <button className="db-exam-dismiss" onClick={() => handleExamSet(null, null)} title="Remove exam">✕</button>
                </div>
            )}

            {/* ── Home grid ─────────────────────────────────────────────── */}
            <div className="db-home-grid">

                {/* Top-left (2×1): Welcome */}
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
                        disabled={!firstDeck}
                        onClick={() => firstDeck && navigate(`/decks/${firstDeck.id ?? firstDeck.deckId}`, { state: { deck: firstDeck } })}
                    >
                        ▶ Start Session
                    </button>
                </div>

                {/* Top-right (1×1): Streak */}
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

                {/* Bottom-right column: Mastery Funnel + AI Generator */}
                <div className="db-right-col">
                    <div className="db-widget db-widget--funnel">
                        <MasteryFunnel data={dashboardStats?.mastery || null} />
                        {dashboardStats && (
                            <button className="db-funnel-link" onClick={() => navigate('/study')}>
                                Full Stats →
                            </button>
                        )}
                    </div>
                    <div className="db-widget db-widget--ai">
                        <div className="db-widget-title">✨ AI Card Generator</div>
                        <AIGenerator decks={decks} onCardsAdded={(deckId, newCards) => {
                            setCardCounts(p => ({ ...p, [String(deckId)]: (p[String(deckId)] || 0) + newCards.length }));
                        }} />
                    </div>
                </div>

            </div>

            {/* ── My Decks ───────────────────────────────────────────────── */}
            {loading && <div className="db-loading">Loading…</div>}
            {!loading && error && <p className="db-error">{error}</p>}
            {deleteError && <p className="db-error">{deleteError}</p>}

            {!loading && !error && (
                <div className="db-main">
                    <div className="db-section-hdr">
                        <h2>My Decks</h2>
                        <button className="db-btn db-btn--primary" onClick={() => { setShowDeckForm(v => !v); setDeckFormError(''); }}>
                            {showDeckForm ? 'Cancel' : '+ New Deck'}
                        </button>
                    </div>

                    {showDeckForm && (
                        <form className="db-form" onSubmit={handleCreateDeck}>
                            <input className="db-input" placeholder="Deck title"  value={deckTitle}   onChange={e => setDeckTitle(e.target.value)}   disabled={creatingDeck} />
                            <input className="db-input" placeholder="Subject"     value={deckSubject} onChange={e => setDeckSubject(e.target.value)} disabled={creatingDeck} />
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
                                const id    = deck.id ?? deck.deckId;
                                const count = cardCounts[String(id)] ?? 0;
                                const dest  = `/decks/${id}`;
                                const st    = { deck };
                                return (
                                    <div key={id} className={`db-deck-card db-deck-card--${ACCENTS[i % ACCENTS.length]}`}>
                                        <div className="db-deck-card-top">
                                            <span className="db-deck-icon">📚</span>
                                            <div className="db-deck-info">
                                                <div className="db-deck-title">{deck.title}</div>
                                                <div className="db-deck-subject">{deck.subject}</div>
                                            </div>
                                        </div>
                                        <div className="db-deck-count">{count} card{count !== 1 ? 's' : ''}</div>
                                        <div className="db-deck-actions">
                                            <button className="db-btn db-btn--study"  onClick={() => navigate(dest, { state: st })}>▶ Study</button>
                                            <button className="db-btn db-btn--manage" onClick={() => navigate(dest, { state: st })} title="Manage Cards">⚙️</button>
                                            <button className="db-del-btn"            onClick={() => handleDeleteDeck(id)}>🗑️</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default Dashboard;
