import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AIGenerator from '../components/AIGenerator';
import SmartCalendar from '../components/SmartCalendar';
import MasteryFunnel from '../components/MasteryFunnel';
import { getDecks, getCardsByDeck, createDeck, updateDeck, deleteDeck } from '../services/dashboardService';
import { getStats, getDashboardStats } from '../services/statsService';
import { getNotes, createNote, updateNote, deleteNote } from '../services/noteService';
import './Dashboard.css';

const ACCENTS = ['blue', 'purple', 'green', 'amber'];

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

    const [editingDeckId, setEditingDeckId]       = useState(null);
    const [editDeckTitle, setEditDeckTitle]       = useState('');
    const [editDeckSubject, setEditDeckSubject]   = useState('');
    const [editDeckError, setEditDeckError]       = useState('');
    const [savingDeck, setSavingDeck]             = useState(false);

    const [notes, setNotes] = useState([]);

    const handleNoteAdd = async (date, text) => {
        try {
            const note = await createNote(date, text);
            setNotes(prev => [...prev, note]);
        } catch { /* silent — note just won't appear */ }
    };

    const handleNoteUpdate = async (id, text) => {
        try {
            const updated = await updateNote(id, text);
            setNotes(prev => prev.map(n => n.id === id ? updated : n));
        } catch { /* silent */ }
    };

    const handleNoteDelete = async (id) => {
        try {
            await deleteNote(id);
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch { /* silent */ }
    };

    const handleStartEditDeck = (deck) => {
        setEditingDeckId(deck.id ?? deck.deckId);
        setEditDeckTitle(deck.title);
        setEditDeckSubject(deck.subject);
        setEditDeckError('');
    };

    const handleSaveDeck = async (id) => {
        if (!editDeckTitle.trim() || !editDeckSubject.trim()) return;
        setSavingDeck(true); setEditDeckError('');
        try {
            await updateDeck(id, editDeckTitle.trim(), editDeckSubject.trim());
            setDecks(prev => prev.map(d => (d.id ?? d.deckId) === id
                ? { ...d, title: editDeckTitle.trim(), subject: editDeckSubject.trim() }
                : d
            ));
            setEditingDeckId(null);
        } catch (err) {
            setEditDeckError(err.response?.data?.error?.message || 'Failed to update deck.');
        } finally { setSavingDeck(false); }
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
                const [deckList, statsData, dsData, notesData] = await Promise.all([
                    getDecks(),
                    getStats().catch(() => null),
                    getDashboardStats().catch(() => null),
                    getNotes().catch(() => [])
                ]);
                if (cancelled) return;
                setDecks(deckList);
                setStats(statsData);
                setDashboardStats(dsData);
                setNotes(notesData);

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

    const upcomingNotes = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return notes
            .filter(n => n.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 3);
    }, [notes]);

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

            {/* ── Upcoming notes banner ──────────────────────────────────── */}
            {upcomingNotes.length > 0 && (
                <div className="db-exam-banner">
                    {upcomingNotes.map(note => {
                        const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime();
                        const noteMs  = new Date(note.date + 'T00:00:00').getTime();
                        const daysLeft = Math.round((noteMs - todayMs) / 86400000);
                        return (
                            <div key={note.id} className="db-exam-banner-row">
                                <span>📅 <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — {note.text}</span>
                                <button className="db-exam-dismiss" onClick={() => handleNoteDelete(note.id)} title="Remove">✕</button>
                            </div>
                        );
                    })}
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
                        notes={notes}
                        onNoteAdd={handleNoteAdd}
                        onNoteUpdate={handleNoteUpdate}
                        onNoteDelete={handleNoteDelete}
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

                    {decks.filter(d => !d.shared).length === 0 ? (
                        <div className="db-empty">No decks yet. Create one to get started!</div>
                    ) : (
                        <div className="db-deck-grid">
                            {decks.filter(d => !d.shared).map((deck, i) => {
                                const id    = deck.id ?? deck.deckId;
                                const count = cardCounts[String(id)] ?? 0;
                                const dest  = `/decks/${id}`;
                                const st    = { deck };
                                const isEditing = editingDeckId === id;
                                return (
                                    <div key={id} className={`db-deck-card db-deck-card--${ACCENTS[i % ACCENTS.length]}`}>
                                        {isEditing ? (
                                            <div className="db-deck-edit-form">
                                                <input
                                                    className="db-input"
                                                    value={editDeckTitle}
                                                    onChange={e => setEditDeckTitle(e.target.value)}
                                                    placeholder="Deck title"
                                                    disabled={savingDeck}
                                                />
                                                <input
                                                    className="db-input"
                                                    value={editDeckSubject}
                                                    onChange={e => setEditDeckSubject(e.target.value)}
                                                    placeholder="Subject"
                                                    disabled={savingDeck}
                                                />
                                                {editDeckError && <p className="db-form-error">{editDeckError}</p>}
                                                <div className="db-deck-edit-actions">
                                                    <button className="db-btn db-btn--success" onClick={() => handleSaveDeck(id)} disabled={savingDeck || !editDeckTitle.trim() || !editDeckSubject.trim()}>
                                                        {savingDeck ? 'Saving…' : 'Save'}
                                                    </button>
                                                    <button className="db-btn db-btn--ghost" onClick={() => setEditingDeckId(null)} disabled={savingDeck}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="db-deck-card-top">
                                                    <span className="db-deck-icon">📚</span>
                                                    <div className="db-deck-info">
                                                        <div className="db-deck-title">{deck.title}</div>
                                                        <div className="db-deck-subject">{deck.subject}</div>
                                                    </div>
                                                </div>
                                                <div className="db-deck-count">{count} card{count !== 1 ? 's' : ''}</div>
                                                <div className="db-deck-actions">
                                                    <button className="db-btn db-btn--study" onClick={() => navigate(dest, { state: st })}>▶ Study</button>
                                                </div>
                                                <div className="db-deck-icon-row">
                                                    <button className="db-btn db-btn--manage" onClick={() => navigate(dest, { state: st })} title="Manage Cards">⚙️</button>
                                                    <button className="db-btn db-btn--manage" onClick={() => handleStartEditDeck(deck)} title="Edit Deck">✏️</button>
                                                    <button className="db-del-btn" onClick={() => handleDeleteDeck(id)}>🗑️</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Shared with Me ── */}
                    {decks.filter(d => d.shared).length > 0 && (
                        <>
                            <div className="db-section-hdr" style={{ marginTop: '28px' }}>
                                <h2>Shared with Me</h2>
                            </div>
                            <div className="db-deck-grid">
                                {decks.filter(d => d.shared).map((deck, i) => {
                                    const id    = deck.id ?? deck.deckId;
                                    const count = cardCounts[String(id)] ?? 0;
                                    const dest  = `/decks/${id}`;
                                    const st    = { deck };
                                    return (
                                        <div key={`shared-${id}`} className={`db-deck-card db-deck-card--${ACCENTS[i % ACCENTS.length]} db-deck-card--shared`}>
                                            <div className="db-deck-card-top">
                                                <span className="db-deck-icon">🤝</span>
                                                <div className="db-deck-info">
                                                    <div className="db-deck-title">{deck.title}</div>
                                                    <div className="db-deck-subject">{deck.subject}</div>
                                                </div>
                                            </div>
                                            <div className="db-deck-count">{count} card{count !== 1 ? 's' : ''}</div>
                                            <div className="db-deck-actions">
                                                <button className="db-btn db-btn--study" onClick={() => navigate(dest, { state: st })}>▶ Study</button>
                                            </div>
                                            <div className="db-deck-icon-row">
                                                <button className="db-btn db-btn--manage" onClick={() => navigate(dest, { state: st })} title="Open Deck">⚙️</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
};

export default Dashboard;
