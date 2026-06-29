import React, { useState } from 'react';
import { searchDecks, requestAccess } from '../services/shareService';
import './Discover.css';

const Discover = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [requesting, setRequesting] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true); setError(''); setSearched(true);
        try {
            const data = await searchDecks(query.trim());
            setResults(data);
        } catch {
            setError('Search failed. Please try again.');
        } finally { setLoading(false); }
    };

    const handleRequest = async (deck) => {
        setRequesting(deck.id); setError('');
        try {
            await requestAccess(deck.id);
            setResults(prev => prev.map(d => d.id === deck.id ? { ...d, requestStatus: 'pending' } : d));
        } catch (err) {
            const msg = err.response?.data?.error?.message || 'Request failed.';
            setError(msg);
        } finally { setRequesting(null); }
    };

    const statusLabel = (deck) => {
        if (deck.hasAccess) return <span className="disc-badge disc-badge--access">✓ Access granted</span>;
        if (deck.requestStatus === 'pending') return <span className="disc-badge disc-badge--pending">⏳ Pending</span>;
        if (deck.requestStatus === 'rejected') return <span className="disc-badge disc-badge--rejected">✗ Rejected</span>;
        return null;
    };

    return (
        <div className="disc-page">
            <h1 className="disc-title">🔍 Discover Decks</h1>
            <p className="disc-sub">Search for public decks shared by other users.</p>

            <form className="disc-form" onSubmit={handleSearch}>
                <input
                    className="disc-input"
                    placeholder="Search by topic or subject (e.g. Machine Learning, Spanish…)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button className="disc-btn" type="submit" disabled={loading || !query.trim()}>
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </form>

            {error && <p className="disc-error">{error}</p>}

            {searched && !loading && results.length === 0 && (
                <div className="disc-empty">No public decks found for "{query}". Try a different search.</div>
            )}

            <div className="disc-results">
                {results.map(deck => (
                    <div key={deck.id} className="disc-card">
                        <div className="disc-card-info">
                            <div className="disc-card-title">{deck.title}</div>
                            <div className="disc-card-meta">{deck.subject} · by {deck.owner?.username || deck.owner?.firstName}</div>
                        </div>
                        <div className="disc-card-action">
                            {statusLabel(deck) || (
                                <button
                                    className="disc-request-btn"
                                    onClick={() => handleRequest(deck)}
                                    disabled={requesting === deck.id}
                                >
                                    {requesting === deck.id ? 'Sending…' : 'Request Access'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Discover;
