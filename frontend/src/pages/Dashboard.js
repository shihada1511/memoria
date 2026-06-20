import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Table from '../components/Table';
import StudySession from '../components/StudySession';
import AIGenerator from '../components/AIGenerator';
import { getDecks, getCardsByDeck } from '../services/dashboardService';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDeck, setActiveDeck] = useState(null);

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

          {/* ── AI Card Generator (Part 3) ─────────────────────────────────── */}
          <div className="dashboard-section-header">
            <h2>AI Card Generator</h2>
          </div>
          <AIGenerator />

          {/* ── Live Study Session (Part 2) ────────────────────────────────── */}
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
              />
            </>
          )}

          {/* ── Decks ─────────────────────────────────────────────────────── */}
          <div className="dashboard-section-header">
            <h2>Your Decks</h2>
            <span className="dashboard-section-count">{decks.length} deck{decks.length === 1 ? '' : 's'}</span>
          </div>
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
                />
              ))}
            </div>
          )}

          {/* ── Flashcards ────────────────────────────────────────────────── */}
          <div className="dashboard-section-header">
            <h2>Flashcards</h2>
            <span className="dashboard-section-count">{cards.length} card{cards.length === 1 ? '' : 's'}</span>
          </div>
          <Table columns={tableColumns} rows={cards} emptyMessage="No flashcards to display yet." />
        </>
      )}
    </div>
  );
};

export default Dashboard;
