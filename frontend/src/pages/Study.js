import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Heatmap from '../components/Heatmap';
import { getStats } from '../services/statsService';
import './Study.css';

const fmtDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
};

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="study-tooltip">
            <div className="study-tooltip-date">{fmtDate(label)}</div>
            <div className="study-tooltip-rate">{payload[0].value}% correct</div>
            <div className="study-tooltip-cards">{payload[0].payload.total} cards reviewed</div>
        </div>
    );
};

const StatCard = ({ icon, value, label, sub, accent }) => (
    <div className={`study-stat-card study-stat-card--${accent}`}>
        <span className="study-stat-icon">{icon}</span>
        <div className="study-stat-value">{value}</div>
        <div className="study-stat-label">{label}</div>
        {sub && <div className="study-stat-sub">{sub}</div>}
    </div>
);

const Study = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getStats()
            .then(setStats)
            .catch(() => setError('Failed to load statistics.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="study-loading">Loading statistics…</div>;
    if (error)   return <div className="study-error">{error}</div>;

    const { heatmap, retention, streak, longestStreak, totalCards, totalCorrect, overallRate, deckStats } = stats;
    const totalIncorrect = totalCards - totalCorrect;

    return (
        <div className="study-page">
            <h1 className="study-heading">📊 Study Statistics</h1>

            {/* ── Summary cards ── */}
            <div className="study-stat-grid">
                <StatCard icon="🔥" value={streak}  label="Current Streak"  sub={`${streak === 1 ? 'day' : 'days'} in a row`} accent="purple" />
                <StatCard icon="⚡" value={longestStreak} label="Best Streak" sub="all time" accent="blue" />
                <StatCard icon="📚" value={totalCards.toLocaleString()} label="Cards Studied" sub={`${totalCorrect.toLocaleString()} correct · ${totalIncorrect.toLocaleString()} missed`} accent="green" />
                <StatCard icon="🎯" value={`${overallRate}%`} label="Overall Accuracy" sub="all time" accent="amber" />
            </div>

            {/* ── Activity heatmap ── */}
            <div className="study-section">
                <h2 className="study-section-title">Activity — last year</h2>
                {heatmap.length === 0 ? (
                    <p className="study-empty">No activity yet. Start a study session to see your heatmap!</p>
                ) : (
                    <Heatmap data={heatmap} />
                )}
            </div>

            {/* ── Retention chart ── */}
            <div className="study-section">
                <h2 className="study-section-title">Retention Rate — last 60 sessions</h2>
                {retention.length < 2 ? (
                    <p className="study-empty">Study a few more sessions to see your retention trend.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={retention} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={40} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="rate" stroke="#6b46c1" strokeWidth={2.5} dot={{ r: 3, fill: '#6b46c1' }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Deck performance table ── */}
            {deckStats?.length > 0 && (
                <div className="study-section">
                    <h2 className="study-section-title">Deck Performance</h2>
                    <div className="study-deck-table">
                        <div className="study-deck-table-hdr">
                            <span>Deck</span>
                            <span>Subject</span>
                            <span>Cards Studied</span>
                            <span>Accuracy</span>
                            <span>Progress</span>
                        </div>
                        {deckStats.map(d => (
                            <div key={d.deckId} className="study-deck-row">
                                <span className="study-deck-name">{d.title}</span>
                                <span className="study-deck-subject">{d.subject || '—'}</span>
                                <span className="study-deck-total">{d.total}</span>
                                <span className={`study-deck-rate ${d.rate >= 70 ? 'study-deck-rate--good' : d.rate >= 40 ? 'study-deck-rate--mid' : 'study-deck-rate--low'}`}>
                                    {d.rate}%
                                </span>
                                <div className="study-deck-bar-wrap">
                                    <div className="study-deck-bar" style={{ width: `${d.rate}%`, background: d.rate >= 70 ? '#10b981' : d.rate >= 40 ? '#f59e0b' : '#ef4444' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Study;
