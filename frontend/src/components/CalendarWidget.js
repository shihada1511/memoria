import React, { useMemo, useState } from 'react';
import './CalendarWidget.css';

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const intensityClass = (count) => {
    if (count === 0) return '';
    if (count <= 3)  return 'cal-day--lvl1';
    if (count <= 7)  return 'cal-day--lvl2';
    if (count <= 14) return 'cal-day--lvl3';
    return 'cal-day--lvl4';
};

const CalendarWidget = ({ data = [] }) => {
    const [offset, setOffset] = useState(0); // months from today

    const countByDate = useMemo(() => {
        const m = {};
        data.forEach(({ date, count }) => { m[date] = count; });
        return m;
    }, [data]);

    const { year, month, cells, monthLabel } = useMemo(() => {
        const ref = new Date();
        ref.setDate(1);
        ref.setMonth(ref.getMonth() + offset);
        const y = ref.getFullYear();
        const mo = ref.getMonth();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().slice(0, 10);

        const firstDay = new Date(y, mo, 1);
        const lastDay  = new Date(y, mo + 1, 0);

        // Monday-start: shift so Mon=0, Sun=6
        const startOffset = (firstDay.getDay() + 6) % 7;
        const totalCells  = startOffset + lastDay.getDate();
        const gridSize    = Math.ceil(totalCells / 7) * 7;

        const arr = [];
        for (let i = 0; i < gridSize; i++) {
            const d = new Date(y, mo, 1 - startOffset + i);
            const dateStr = d.toISOString().slice(0, 10);
            arr.push({
                dateStr,
                day: d.getDate(),
                inMonth: d.getMonth() === mo,
                isToday: dateStr === todayStr,
                isFuture: d > today,
                count: countByDate[dateStr] || 0
            });
        }

        return { year: y, month: mo, cells: arr, monthLabel: `${MONTHS[mo]} ${y}` };
    }, [offset, countByDate]);

    const canGoNext = useMemo(() => {
        const now = new Date();
        return !(year === now.getFullYear() && month === now.getMonth());
    }, [year, month]);

    return (
        <div className="cal-widget">
            <div className="cal-header">
                <button className="cal-nav" onClick={() => setOffset(o => o - 1)}>‹</button>
                <span className="cal-title">{monthLabel}</span>
                <button className="cal-nav" onClick={() => setOffset(o => o + 1)} disabled={!canGoNext}>›</button>
            </div>
            <div className="cal-grid">
                {DAY_HEADERS.map(d => (
                    <div key={d} className="cal-day-hdr">{d}</div>
                ))}
                {cells.map((cell, i) => (
                    <div
                        key={i}
                        className={[
                            'cal-day',
                            !cell.inMonth   && 'cal-day--other',
                            cell.isToday    && 'cal-day--today',
                            cell.isFuture   && 'cal-day--future',
                            cell.inMonth && !cell.isFuture && intensityClass(cell.count)
                        ].filter(Boolean).join(' ')}
                        title={cell.inMonth && !cell.isFuture && cell.count > 0
                            ? `${cell.count} card${cell.count !== 1 ? 's' : ''} studied`
                            : undefined}
                    >
                        {cell.day}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarWidget;
