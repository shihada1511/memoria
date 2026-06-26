import React, { useMemo } from 'react';
import './Heatmap.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const colorLevel = (count) => {
    if (count === 0) return 0;
    if (count <= 3) return 1;
    if (count <= 7) return 2;
    if (count <= 14) return 3;
    return 4;
};

const Heatmap = ({ data }) => {
    const { weeks, monthLabels } = useMemo(() => {
        const countByDate = {};
        (data || []).forEach(({ date, count }) => { countByDate[date] = count; });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from the Sunday of the week 52 weeks ago
        const start = new Date(today);
        start.setDate(start.getDate() - 364);
        start.setDate(start.getDate() - start.getDay()); // back to Sunday

        const weeksArr = [];
        const months = [];
        const cur = new Date(start);
        let weekIdx = 0;

        while (cur <= today) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = cur.toISOString().slice(0, 10);
                const isFuture = cur > today;
                week.push({ date: dateStr, count: countByDate[dateStr] || 0, isFuture });

                // Track month label (first cell of a new month in this week's Sunday position)
                if (d === 0) {
                    const m = cur.getMonth();
                    const prev = months[months.length - 1];
                    if (!prev || prev.month !== m) {
                        months.push({ month: m, weekIdx });
                    }
                }

                cur.setDate(cur.getDate() + 1);
            }
            weeksArr.push(week);
            weekIdx++;
        }

        return { weeks: weeksArr, monthLabels: months };
    }, [data]);

    return (
        <div className="heatmap-wrap">
            <div className="heatmap-months">
                {monthLabels.map(({ month, weekIdx }, i) => (
                    <span
                        key={i}
                        className="heatmap-month-label"
                        style={{ gridColumnStart: weekIdx + 1 }}
                    >
                        {MONTHS[month]}
                    </span>
                ))}
            </div>
            <div className="heatmap-body">
                <div className="heatmap-days">
                    {[1, 3, 5].map(d => (
                        <span key={d} className="heatmap-day-label">{DAYS[d]}</span>
                    ))}
                </div>
                <div className="heatmap-grid">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="heatmap-week">
                            {week.map((cell, di) => (
                                <div
                                    key={di}
                                    className={`heatmap-cell heatmap-cell--${cell.isFuture ? 'future' : colorLevel(cell.count)}`}
                                    title={cell.isFuture ? '' : `${cell.date}: ${cell.count} card${cell.count !== 1 ? 's' : ''}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="heatmap-legend">
                <span className="heatmap-legend-label">Less</span>
                {[0, 1, 2, 3, 4].map(l => (
                    <div key={l} className={`heatmap-cell heatmap-cell--${l}`} />
                ))}
                <span className="heatmap-legend-label">More</span>
            </div>
        </div>
    );
};

export default Heatmap;
