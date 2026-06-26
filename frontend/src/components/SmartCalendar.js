import React, { useState, useMemo } from 'react';
import './SmartCalendar.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toStr = (d) => d.toISOString().slice(0, 10);
const todayISO = () => toStr(new Date());

const fmtFull = (dateStr) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const SmartCalendar = ({ heatmapData = [], forecastData = [], examDate, examName, onExamSet }) => {
    const [offset, setOffset] = useState(0);
    const [pendingDate, setPendingDate] = useState(null);
    const [examInput, setExamInput] = useState('');

    const today = todayISO();

    const viewDate = useMemo(() => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() + offset);
        return d;
    }, [offset]);

    const studyByDate = useMemo(() => {
        const m = {};
        heatmapData.forEach(({ date, count }) => { m[date] = count; });
        return m;
    }, [heatmapData]);

    const forecastByDate = useMemo(() => {
        const m = {};
        forecastData.forEach(({ date, count }) => { if (count > 0) m[date] = count; });
        return m;
    }, [forecastData]);

    const cells = useMemo(() => {
        const y = viewDate.getFullYear();
        const mo = viewDate.getMonth();
        const first = new Date(y, mo, 1);
        const last  = new Date(y, mo + 1, 0);
        const startOffset = (first.getDay() + 6) % 7; // Mon=0

        const result = [];

        for (let i = startOffset - 1; i >= 0; i--) {
            const d = new Date(y, mo, -i);
            result.push({ dateStr: toStr(d), day: d.getDate(), inMonth: false, past: toStr(d) < today });
        }
        for (let day = 1; day <= last.getDate(); day++) {
            const d = new Date(y, mo, day);
            const ds = toStr(d);
            result.push({ dateStr: ds, day, inMonth: true, past: ds < today, isToday: ds === today });
        }
        while (result.length < 42) {
            const d = new Date(y, mo + 1, result.length - startOffset - last.getDate() + 1);
            result.push({ dateStr: toStr(d), day: d.getDate(), inMonth: false, past: false });
        }
        return result;
    }, [viewDate, today]);

    const handleDayClick = (cell) => {
        if (!cell.inMonth || cell.past || cell.isToday) return;
        if (cell.dateStr === examDate) { onExamSet(null, null); return; }
        setPendingDate(cell.dateStr);
        setExamInput('');
    };

    const handleSetExam = () => {
        if (!pendingDate || !examInput.trim()) return;
        onExamSet(pendingDate, examInput.trim());
        setPendingDate(null);
        setExamInput('');
    };

    const dotCls = (count) => {
        if (!count) return null;
        if (count > 30) return 'sc-dot sc-dot--dark';
        if (count > 10) return 'sc-dot sc-dot--mid';
        return 'sc-dot sc-dot--light';
    };

    const cls = (cell) => {
        const c = ['sc-day'];
        if (!cell.inMonth)              c.push('sc-day--out');
        if (cell.isToday)               c.push('sc-day--today');
        if (cell.inMonth && !cell.past && !cell.isToday) c.push('sc-day--future');
        if (cell.dateStr === examDate && cell.inMonth)   c.push('sc-day--exam');
        if (cell.dateStr === pendingDate)                 c.push('sc-day--pending');
        return c.join(' ');
    };

    const forecast = (cell) =>
        cell.inMonth && !cell.past && !cell.isToday && forecastByDate[cell.dateStr]
            ? `${forecastByDate[cell.dateStr]} card${forecastByDate[cell.dateStr] !== 1 ? 's' : ''} scheduled for review`
            : undefined;

    return (
        <div className="sc">
            <div className="sc-head">
                <button className="sc-nav" onClick={() => setOffset(o => o - 1)}>‹</button>
                <span className="sc-month">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                <button className="sc-nav" onClick={() => setOffset(o => o + 1)} disabled={offset >= 6}>›</button>
            </div>

            <div className="sc-grid">
                {DAY_NAMES.map(d => <div key={d} className="sc-hdr">{d}</div>)}
                {cells.map((cell, i) => (
                    <div
                        key={i}
                        className={cls(cell)}
                        onClick={() => handleDayClick(cell)}
                        data-tooltip={forecast(cell)}
                    >
                        <span className="sc-num">{cell.day}</span>
                        {cell.inMonth && cell.past && dotCls(studyByDate[cell.dateStr]) && (
                            <span className={dotCls(studyByDate[cell.dateStr])} />
                        )}
                    </div>
                ))}
            </div>

            {/* Exam-date setter form */}
            {pendingDate && (
                <div className="sc-form">
                    <p className="sc-form-label">Set exam for <strong>{fmtFull(pendingDate)}</strong></p>
                    <input
                        className="sc-form-input"
                        placeholder="Exam name (e.g. Geomechanics Final)"
                        value={examInput}
                        onChange={e => setExamInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSetExam()}
                        autoFocus
                    />
                    <div className="sc-form-row">
                        <button className="sc-form-btn sc-form-btn--set" onClick={handleSetExam} disabled={!examInput.trim()}>
                            Set Exam Date
                        </button>
                        <button className="sc-form-btn sc-form-btn--cancel" onClick={() => setPendingDate(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="sc-legend">
                <div className="sc-legend-row">
                    <span className="sc-dot sc-dot--light" /> <span>1–10 cards</span>
                    <span className="sc-dot sc-dot--mid"   /> <span>11–30 cards</span>
                    <span className="sc-dot sc-dot--dark"  /> <span>30+ cards</span>
                </div>
                <p className="sc-hint">
                    {examDate && examName
                        ? `Exam: ${examName} · ${fmtFull(examDate)} — click to remove`
                        : 'Click a future date to set an exam target'}
                </p>
            </div>
        </div>
    );
};

export default SmartCalendar;
