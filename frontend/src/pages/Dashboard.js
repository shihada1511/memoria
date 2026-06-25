import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import StudySession from '../components/StudySession';
import AIGenerator from '../components/AIGenerator';
import { getDecks, getCardsByDeck, createDeck, createCard, deleteDeck, deleteCard } from '../services/dashboardService';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDeck, setActiveDeck] = useState(null);

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
  const [studySessionActive, setStudySessionActive] = useState(false);
  const [revealCardsAnyway, setRevealCardsAnyway] = useState(false);

  const deckAccents = ['blue', 'purple', 'green', 'amber'];

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const deckList = await getDecks();
        if (cancelled) return;
        setDecks(deckList);

        const cardLists = await Promise.all(
          deckList.map(async (deck, index) => {
            const deckCards = await getCardsByDeck(deck.id ?? deck.deckId);
            const accent = deckAccents[index % deckAccents.length];
            return deckCards.map((card) => ({ ...card, deckTitle: deck.title, deckAccent: accent }));
          })
        );

        if (!cancelled) {
          setCards(cardLists.flat());
          if (deckList.length > 0 && !activeDeck) {
            setActiveDeck({ id: deckList[0].id ?? deckList[0].deckId, title: deckList[0].title });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Failed to load dashboard data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!deckTitle.trim() || !deckSubject.trim()) return;

    setCreatingDeck(true);
    setDeckFormError('');
    try {
      const { deckId } = await createDeck(user.userId, deckTitle.trim(), deckSubject.trim());
      const newDeck = { id: deckId, title: deckTitle.trim(), subject: deckSubject.trim(), createdAt: new Date().toISOString() };
      setDecks((prev) => [...prev, newDeck]);
      if (!activeDeck) setActiveDeck({ id: deckId, title: newDeck.title });
      setDeckTitle('');
      setDeckSubject('');
      setShowDeckForm(false);
    } catch (err) {
      setDeckFormError(err.response?.data?.error?.message || 'Failed to create deck.');
    } finally {
      setCreatingDeck(false);
    }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    const targetDeckId = cardDeckId || activeDeck?.id;
    if (!targetDeckId || !cardQuestion.trim() || !cardAnswer.trim()) return;

    setCreatingCard(true);
    setCardFormError('');
    try {
      const newCard = await createCard(targetDeckId, cardQuestion.trim(), cardAnswer.trim());
      const deckIndex = decks.findIndex((d) => String(d.id ?? d.deckId) === String(targetDeckId));
      const deck = deckIndex >= 0 ? decks[deckIndex] : null;
      const accent = deckAccents[(deckIndex >= 0 ? deckIndex : 0) % deckAccents.length];
      setCards((prev) => [...prev, { ...newCard, deckTitle: deck?.title, deckAccent: accent }]);
      setCardQuestion('');
      setCardAnswer('');
      setShowCardForm(false);
    } catch (err) {
      setCardFormError(err.response?.data?.error?.message || 'Failed to create card.');
    } finally {
      setCreatingCard(false);
    }
  };

  const handleDeleteDeck = async (deckIdToDelete) => {
    if (!window.confirm('Delete this deck and all its cards? This cannot be undone.')) return;

    setDeleteError('');
    try {
      await deleteDeck(deckIdToDelete);
      const remainingDecks = decks.filter((d) => String(d.id ?? d.deckId) !== String(deckIdToDelete));
      setDecks(remainingDecks);
      setCards((prev) => prev.filter((c) => String(c.deckId) !== String(deckIdToDelete)));
      if (activeDeck && String(activeDeck.id) === String(deckIdToDelete)) {
        const next = remainingDecks[0];
        setActiveDeck(next ? { id: next.id ?? next.deckId, title: next.title } : null);
      }
    } catch (err) {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete deck.');
    }
  };

  const handleDeleteCard = async (deckIdForCard, cardId) => {
    if (!window.confirm('Delete this flashcard?')) return;

    setDeleteError('');
    try {
      await deleteCard(deckIdForCard, cardId);
      setCards((prev) => prev.filter((c) => String(c.id) !== String(cardId)));
    } catch (err) {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete card.');
    }
  };

  const handleAICardsAdded = (deckId, newCards) => {
    const deckIndex = decks.findIndex((d) => String(d.id ?? d.deckId) === String(deckId));
    const deck = deckIndex >= 0 ? decks[deckIndex] : null;
    const accent = deckAccents[(deckIndex >= 0 ? deckIndex : 0) % deckAccents.length];
    setCards((prev) => [...prev, ...newCards.map((c) => ({ ...c, deckTitle: deck?.title, deckAccent: accent }))]);
  };

  const tableColumns = [
    {
      key: 'question',
      header: 'Question',
      render: (row) => <span className="dashboard-question">{row.question}</span>,
    },
    {
      key: 'answer',
      header: 'Answer',
      render: (row) => <span className="dashboard-answer">{row.answer}</span>,
    },
    {
      key: 'deckTitle',
      header: 'Deck',
      render: (row) => (
        <span className={`memoria-table-badge dashboard-badge-${row.deckAccent}`}>{row.deckTitle}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          className="dashboard-delete-btn dashboard-delete-btn-sm"
          onClick={() => handleDeleteCard(row.deckId, row.id)}
          title="Delete card"
        >
          🗑️
        </button>
      ),
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div>
          <span className="dashboard-hero-eyebrow">Dashboard</span>
          <h1>Welcome back{user ? `, ${user.firstName}` : ''} 👋</h1>
          <p className="dashboard-subtitle">Here's an overview of your study decks and flashcards.</p>
        </div>
      </div>

      {loading && (
        <div className="dashboard-stats">
          {[0, 1, 2].map((i) => <div key={i} className="dashboard-skeleton" />)}
        </div>
      )}
      {!loading && error && <p className="dashboard-status dashboard-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="dashboard-stats">
            <Card icon="🗂️" accent="blue" title={String(decks.length)} subtitle="Total Decks" description="Decks available to study right now." />
            <Card icon="🃏" accent="purple" title={String(cards.length)} subtitle="Total Cards" description="Flashcards across all your decks." />
            <Card icon="🛡️" accent="green" title={user?.userRole ?? 'guest'} subtitle="Your Role" description="Determines what you can manage." />
          </div>

          {deleteError && <p className="dashboard-status dashboard-error">{deleteError}</p>}

          {/* ── Decks ─────────────────────────────────────────────────────── */}
          <div className="dashboard-section-header">
            <h2>Your Decks</h2>
            <div className="dashboard-section-actions">
              <span className="dashboard-section-count">{decks.length} deck{decks.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                className="dashboard-add-btn"
                onClick={() => { setShowDeckForm((v) => !v); setDeckFormError(''); }}
              >
                {showDeckForm ? 'Cancel' : '+ New Deck'}
              </button>
            </div>
          </div>

          {showDeckForm && (
            <form className="dashboard-inline-form" onSubmit={handleCreateDeck}>
              <input
                className="dashboard-form-input"
                type="text"
                placeholder="Deck title (e.g. World History)"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                disabled={creatingDeck}
              />
              <input
                className="dashboard-form-input"
                type="text"
                placeholder="Subject (e.g. History)"
                value={deckSubject}
                onChange={(e) => setDeckSubject(e.target.value)}
                disabled={creatingDeck}
              />
              <button
                type="submit"
                className="dashboard-form-submit"
                disabled={creatingDeck || !deckTitle.trim() || !deckSubject.trim()}
              >
                {creatingDeck ? 'Creating…' : 'Create Deck'}
              </button>
              {deckFormError && <p className="dashboard-form-error">{deckFormError}</p>}
            </form>
          )}

          {decks.length === 0 ? (
            <p className="dashboard-empty">You don't have any decks yet. Create one to get started!</p>
          ) : (
            <div className="dashboard-decks">
              {decks.map((deck, index) => (
                <Card
                  key={deck.deckId ?? deck.id}
                  icon="📚"
                  accent={deckAccents[index % deckAccents.length]}
                  title={deck.title}
                  subtitle={deck.subject}
                  description={`Created on ${new Date(deck.createdAt).toLocaleDateString()}`}
                  footer={
                    <button
                      type="button"
                      className="dashboard-delete-btn"
                      onClick={() => handleDeleteDeck(deck.id ?? deck.deckId)}
                    >
                      🗑️ Delete Deck
                    </button>
                  }
                />
              ))}
            </div>
          )}

          {/* ── Live Study Session ────────────────────────────────────────── */}
          {activeDeck && (
            <>
              <div className="dashboard-section-header">
                <h2>Live Study Session</h2>
                {decks.length > 1 && (
                  <select
                    className="dashboard-deck-select"
                    value={activeDeck.id}
                    onChange={(e) => {
                      const d = decks.find(d => String(d.id ?? d.deckId) === e.target.value);
                      if (d) setActiveDeck({ id: d.id ?? d.deckId, title: d.title });
                    }}
                  >
                    {decks.map(d => (
                      <option key={d.id ?? d.deckId} value={d.id ?? d.deckId}>{d.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <StudySession
                deck={activeDeck}
                username={user?.firstName || user?.email || 'Anonymous'}
                onActiveChange={(active) => {
                  setStudySessionActive(active);
                  if (active) setRevealCardsAnyway(false);
                }}
              />
            </>
          )}

          {/* ── Flashcards ────────────────────────────────────────────────── */}
          <div className="dashboard-section-header">
            <h2>Flashcards</h2>
            <div className="dashboard-section-actions">
              <span className="dashboard-section-count">{cards.length} card{cards.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                className="dashboard-add-btn"
                disabled={decks.length === 0}
                title={decks.length === 0 ? 'Create a deck first' : ''}
                onClick={() => {
                  setShowCardForm((v) => !v);
                  setCardFormError('');
                  setCardDeckId(String(activeDeck?.id ?? decks[0]?.id ?? decks[0]?.deckId ?? ''));
                }}
              >
                {showCardForm ? 'Cancel' : '+ New Card'}
              </button>
            </div>
          </div>

          {showCardForm && (
            <form className="dashboard-inline-form" onSubmit={handleCreateCard}>
              <select
                className="dashboard-form-input"
                value={cardDeckId}
                onChange={(e) => setCardDeckId(e.target.value)}
                disabled={creatingCard}
              >
                {decks.map((d) => (
                  <option key={d.id ?? d.deckId} value={d.id ?? d.deckId}>{d.title}</option>
                ))}
              </select>
              <input
                className="dashboard-form-input"
                type="text"
                placeholder="Question"
                value={cardQuestion}
                onChange={(e) => setCardQuestion(e.target.value)}
                disabled={creatingCard}
              />
              <input
                className="dashboard-form-input"
                type="text"
                placeholder="Answer"
                value={cardAnswer}
                onChange={(e) => setCardAnswer(e.target.value)}
                disabled={creatingCard}
              />
              <button
                type="submit"
                className="dashboard-form-submit"
                disabled={creatingCard || !cardDeckId || !cardQuestion.trim() || !cardAnswer.trim()}
              >
                {creatingCard ? 'Creating…' : 'Create Card'}
              </button>
              {cardFormError && <p className="dashboard-form-error">{cardFormError}</p>}
            </form>
          )}

          {studySessionActive && !revealCardsAnyway ? (
            <div className="dashboard-hidden-cards">
              <p>🙈 Flashcards are hidden while you're in a study session, so you can't peek at the answers.</p>
              <button
                type="button"
                className="dashboard-add-btn"
                onClick={() => setRevealCardsAnyway(true)}
              >
                Show anyway
              </button>
            </div>
          ) : (
            <Table columns={tableColumns} rows={cards} emptyMessage="No flashcards to display yet." />
          )}

          {/* ── AI Card Generator ─────────────────────────────────────────── */}
          <div className="dashboard-section-header">
            <h2>AI Card Generator</h2>
          </div>
          <AIGenerator decks={decks} onCardsAdded={handleAICardsAdded} />
        </>
      )}
    </div>
  );
};

export default Dashboard;
