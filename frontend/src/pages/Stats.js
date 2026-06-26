import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Heatmap from '../components/Heatmap';
import { getStats } from '../services/statsService';
import './Stats.css';

const StatCard = ({ icon, label, value, sub }) => (
    <div className="stats-card">
        <span className="stats-card-icon">{icon}</span>
        <div className="stats-card-value">{value}</div>
        <div className="stats-card-label">{label}</div>
        {sub && <div className="stats-card-sub">{sub}</div>}
    </div>
);

const fmtDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="stats-tooltip">
            <div className="stats-tooltip-date">{fmtDate(label)}</div>
            <div className="stats-tooltip-rate">{payload[0].value}% correct</div>
            <div className="stats-tooltip-total">{payload[0].payload.total} cards</div>
        </div>
    );
};

const Stats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getStats()
            .then(setStats)
            .catch(() => setError('Failed to load statistics.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="stats-loading">Loading statistics…</div>;
    if (error)   return <div className="stats-error">{error}</div>;

    const { heatmap, retention, streak, longestStreak, totalCards, totalCorrect, overallRate } = stats;

    return (
        <div className="stats-page">
            <h1 className="stats-heading">📊 Study Statistics</h1>

            {/* Summary cards */}
            <div className="stats-summary">
                <StatCard
                    icon="🔥"
                    value={streak}
                    label="Current streak"
                    sub={`${streak === 1 ? 'day' : 'days'} in a row`}
                />
                <StatCard
                    icon="⚡"
                    value={longestStreak}
                    label="Longest streak"
                    sub={`${longestStreak === 1 ? 'day' : 'days'} best`}
                />
                <StatCard
                    icon="📚"
                    value={totalCards.toLocaleString()}
                    label="Cards studied"
                    sub={`${totalCorrect.toLocaleString()} correct`}
                />
                <StatCard
                    icon="🎯"
                    value={`${overallRate}%`}
                    label="Overall accuracy"
                    sub="all time"
                />
            </div>

            {/* Heatmap */}
            <div className="stats-section">
                <h2 className="stats-section-title">Activity — last year</h2>
                {heatmap.length === 0 ? (
                    <p className="stats-empty">No activity yet. Start a study session to see your heatmap!</p>
                ) : (
                    <Heatmap data={heatmap} />
                )}
            </div>

            {/* Retention chart */}
            <div className="stats-section">
                <h2 className="stats-section-title">Retention rate — last 60 sessions</h2>
                {retention.length < 2 ? (
                    <p className="stats-empty">Not enough data yet. Study a few more sessions to see your trend!</p>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={retention} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={fmtDate}
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                width={40}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="#6b46c1"
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: '#6b46c1' }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default Stats;
