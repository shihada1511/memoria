import React, { useState, useMemo } from 'react';
import './SmartCalendar.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toStr = (d) => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};
const todayISO = () => toStr(new Date());
const normalizeDate = (d) => String(d || '').slice(0, 10);

const fmtFull = (dateStr) =>
    new Date(normalizeDate(dateStr) + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const SmartCalendar = ({ heatmapData = [], forecastData = [], notes = [], onNoteAdd, onNoteUpdate, onNoteDelete }) => {
    const [offset, setOffset]           = useState(0);
    const [pendingDate, setPendingDate] = useState(null);
    const [noteInput, setNoteInput]     = useState('');
    const [editingId, setEditingId]     = useState(null);
    const [editText, setEditText]       = useState('');

    const today = todayISO();

    const viewDate = useMemo(() => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() + offset);
        return d;
    }, [offset]);

    const studyByDate = useMemo(() => {
        const m = {};
        heatmapData.forEach(({ date, count }) => { m[normalizeDate(date)] = count; });
        return m;
    }, [heatmapData]);

    const forecastByDate = useMemo(() => {
        const m = {};
        forecastData.forEach(({ date, count }) => { if (count > 0) m[normalizeDate(date)] = count; });
        return m;
    }, [forecastData]);

    const notesByDate = useMemo(() => {
        const m = {};
        notes.forEach(note => {
            const key = normalizeDate(note.date);
            if (!m[key]) m[key] = [];
            m[key].push({ ...note, date: key });
        });
        return m;
    }, [notes]);

    const cells = useMemo(() => {
        const y  = viewDate.getFullYear();
        const mo = viewDate.getMonth();
        const first = new Date(y, mo, 1);
        const last  = new Date(y, mo + 1, 0);
        const startOffset = (first.getDay() + 6) % 7;

        const result = [];
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = new Date(y, mo, -i);
            result.push({ dateStr: toStr(d), day: d.getDate(), inMonth: false, past: toStr(d) < today });
        }
        for (let day = 1; day <= last.getDate(); day++) {
            const d  = new Date(y, mo, day);
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
        if (!cell.inMonth) return;
        if (cell.past && !notesByDate[cell.dateStr]) return;
        const next = cell.dateStr === pendingDate ? null : cell.dateStr;
        setPendingDate(next);
        setNoteInput('');
        setEditingId(null);
    };

    const handleAddNote = () => {
        if (!pendingDate || !noteInput.trim()) return;
        onNoteAdd(pendingDate, noteInput.trim());
        setNoteInput('');
    };

    const handleStartEdit = (note) => {
        setEditingId(note.id);
        setEditText(note.text);
    };

    const handleSaveEdit = (id) => {
        if (!editText.trim()) return;
        onNoteUpdate(id, editText.trim());
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const dotCls = (count) => {
        if (!count) return null;
        if (count > 30) return 'sc-dot sc-dot--dark';
        if (count > 10) return 'sc-dot sc-dot--mid';
        return 'sc-dot sc-dot--light';
    };

    const cls = (cell) => {
        const c = ['sc-day'];
        if (!cell.inMonth) c.push('sc-day--out');
        if (cell.isToday)  c.push('sc-day--today');
        if (cell.inMonth && !cell.past && !cell.isToday) c.push('sc-day--future');
        if (cell.inMonth && cell.past && notesByDate[cell.dateStr]) c.push('sc-day--future');
        if (notesByDate[cell.dateStr] && cell.inMonth) c.push('sc-day--has-note');
        if (cell.dateStr === pendingDate) c.push('sc-day--pending');
        return c.join(' ');
    };

    const forecast = (cell) =>
        cell.inMonth && !cell.past && !cell.isToday && forecastByDate[cell.dateStr]
            ? `${forecastByDate[cell.dateStr]} card${forecastByDate[cell.dateStr] !== 1 ? 's' : ''} due`
            : undefined;

    const pendingNotes = pendingDate ? (notesByDate[pendingDate] || []) : [];
    const isPast = pendingDate && pendingDate < today;

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
                        {cell.inMonth && notesByDate[cell.dateStr] && (
                            <span className="sc-note-dot" />
                        )}
                    </div>
                ))}
            </div>

            {pendingDate && (
                <div className="sc-form">
                    <p className="sc-form-label">
                        <strong>{fmtFull(pendingDate)}</strong>
                        {isPast && <span className="sc-past-badge">past</span>}
                    </p>

                    {pendingNotes.length > 0 && (
                        <ul className="sc-notes-list">
                            {pendingNotes.map(note => (
                                <li key={note.id} className="sc-note-item">
                                    {editingId === note.id ? (
                                        <div className="sc-note-edit-row">
                                            <input
                                                className="sc-form-input sc-edit-input"
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit(note.id);
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                autoFocus
                                            />
                                            <button className="sc-note-save" onClick={() => handleSaveEdit(note.id)} disabled={!editText.trim()}>✓</button>
                                            <button className="sc-note-cancel-edit" onClick={handleCancelEdit}>✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="sc-note-text">{note.text}</span>
                                            <div className="sc-note-btns">
                                                <button className="sc-note-edit-btn" onClick={() => handleStartEdit(note)} title="Edit">✏️</button>
                                                <button className="sc-note-delete" onClick={() => onNoteDelete(note.id)} title="Delete">✕</button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {!isPast && (
                        <>
                            <input
                                className="sc-form-input"
                                placeholder="Add a note (e.g. Exam, Meeting, Deadline…)"
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                autoFocus={pendingNotes.length === 0}
                            />
                            <div className="sc-form-row">
                                <button className="sc-form-btn sc-form-btn--set" onClick={handleAddNote} disabled={!noteInput.trim()}>
                                    Add Note
                                </button>
                                <button className="sc-form-btn sc-form-btn--cancel" onClick={() => setPendingDate(null)}>
                                    Close
                                </button>
                            </div>
                        </>
                    )}

                    {isPast && (
                        <button className="sc-form-btn sc-form-btn--cancel" style={{ alignSelf: 'flex-start' }} onClick={() => setPendingDate(null)}>
                            Close
                        </button>
                    )}
                </div>
            )}

            <div className="sc-legend">
                <div className="sc-legend-row">
                    <span className="sc-dot sc-dot--light" /> <span>1–10 cards</span>
                    <span className="sc-dot sc-dot--mid"   /> <span>11–30 cards</span>
                    <span className="sc-dot sc-dot--dark"  /> <span>30+ cards</span>
                    <span className="sc-note-dot" style={{ marginLeft: 6 }} /> <span>note</span>
                </div>
                <p className="sc-hint">Click any date to add or view notes</p>
            </div>
        </div>
    );
};

export default SmartCalendar;
