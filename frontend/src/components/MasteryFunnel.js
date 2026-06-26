import React from 'react';
import './MasteryFunnel.css';

const STAGES = [
    { key: 'new',      label: 'New',      icon: '🆕', color: '#94a3b8', desc: 'Never studied' },
    { key: 'learning', label: 'Learning', icon: '📖', color: '#3b82f6', desc: '1–2 correct' },
    { key: 'familiar', label: 'Familiar', icon: '🔄', color: '#f59e0b', desc: '3–7 correct' },
    { key: 'mastered', label: 'Mastered', icon: '✅', color: '#10b981', desc: '8+ correct' },
];

const MasteryFunnel = ({ data }) => {
    if (!data) return <div className="mf-loading">Loading…</div>;
    if (data.total === 0) return (
        <div className="mf">
            <h3 className="mf-title">Mastery Funnel</h3>
            <p className="mf-empty">Add cards to track mastery progress.</p>
        </div>
    );

    const max = Math.max(...STAGES.map(s => data[s.key] || 0), 1);

    return (
        <div className="mf">
            <h3 className="mf-title">Mastery Funnel</h3>
            <p className="mf-subtitle">{data.total} card{data.total !== 1 ? 's' : ''} total</p>

            <div className="mf-stages">
                {STAGES.map(s => {
                    const count = data[s.key] || 0;
                    const pct = Math.round(count / data.total * 100);
                    const barW = Math.round(count / max * 100);
                    return (
                        <div key={s.key} className="mf-stage">
                            <div className="mf-stage-top">
                                <span className="mf-icon">{s.icon}</span>
                                <div className="mf-stage-labels">
                                    <span className="mf-label">{s.label}</span>
                                    <span className="mf-desc">{s.desc}</span>
                                </div>
                                <div className="mf-nums">
                                    <span className="mf-count" style={{ color: s.color }}>{count}</span>
                                    <span className="mf-pct">{pct}%</span>
                                </div>
                            </div>
                            <div className="mf-track">
                                <div className="mf-bar" style={{ width: `${barW}%`, background: s.color }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {data.mastered > 0 && (
                <div className="mf-badge">
                    🎉 {Math.round(data.mastered / data.total * 100)}% of cards mastered
                </div>
            )}
        </div>
    );
};

export default MasteryFunnel;
