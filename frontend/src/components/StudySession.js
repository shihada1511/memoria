import React, { useEffect, useRef, useState } from 'react';
import { connectSocket, getSocket } from '../services/socketService';
import './StudySession.css';

/**
 * StudySession – real-time study room for a deck.
 *
 * Props:
 *   deck     { id, title }
 *   username string
 */
const StudySession = ({ deck, username }) => {
    const [joined, setJoined] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [events, setEvents] = useState([]);
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = connectSocket();
        const s = socketRef.current;

        s.on('session-update', ({ participants: p, event, username: who }) => {
            setParticipants(p || []);
            if (event === 'joined') addEvent(`${who} joined the session`);
            if (event === 'left') addEvent(`${who} left the session`);
        });

        s.on('card-progress', ({ username: who, cardIndex, totalCards }) => {
            if (who !== username) {
                addEvent(`${who} is on card ${cardIndex + 1} / ${totalCards}`);
            }
        });

        s.on('session-finished', ({ username: who }) => {
            if (who !== username) addEvent(`🎉 ${who} finished studying this deck!`);
        });

        return () => {
            s.off('session-update');
            s.off('card-progress');
            s.off('session-finished');
        };
    }, [username]);

    const addEvent = (text) =>
        setEvents((prev) => [{ text, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));

    const joinSession = () => {
        socketRef.current.emit('join-session', {
            deckId: deck.id,
            deckTitle: deck.title,
            username
        });
        setJoined(true);
        setCurrentIndex(0);
        setFlipped(false);
        addEvent('You joined the session');
    };

    const leaveSession = () => {
        socketRef.current.emit('leave-session', { deckId: deck.id });
        setJoined(false);
        setParticipants([]);
        addEvent('You left the session');
    };

    const handleFlip = () => {
        const next = !flipped;
        setFlipped(next);
        if (next) {
            socketRef.current.emit('card-flipped', {
                deckId: deck.id,
                cardIndex: currentIndex,
                totalCards: cards.length,
                username
            });
        }
    };

    const handleNext = () => {
        const nextIndex = currentIndex + 1;
        setFlipped(false);
        if (nextIndex >= cards.length) {
            socketRef.current.emit('session-complete', { deckId: deck.id, username });
            addEvent('🎉 You finished studying this deck!');
            setCurrentIndex(0);
        } else {
            setCurrentIndex(nextIndex);
        }
    };

    return (
        <div className="study-session">
            <div className="study-session-header">
                <span className="study-session-title">📡 Live Study Session — {deck.title}</span>
                {joined ? (
                    <button className="study-btn study-btn-leave" onClick={leaveSession}>Leave Session</button>
                ) : (
                    <button className="study-btn study-btn-join" onClick={joinSession}>Join Session</button>
                )}
            </div>

            {joined && (
                <div className="study-session-body">
                    <div className="study-session-participants">
                        <span className="study-session-label">👥 Online now:</span>
                        {participants.length === 0 ? (
                            <span className="study-session-empty">No one else</span>
                        ) : (
                            participants.map((p, i) => (
                                <span key={i} className={`study-session-chip ${p.username === username ? 'study-session-chip--me' : ''}`}>
                                    {p.username === username ? `${p.username} (you)` : p.username}
                                </span>
                            ))
                        )}
                    </div>

                    <div className="study-session-log">
                        {events.length === 0 ? (
                            <span className="study-session-empty">No activity yet</span>
                        ) : (
                            events.map((e, i) => (
                                <div key={i} className="study-session-event">
                                    <span className="study-session-event-time">{e.time}</span> {e.text}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudySession;
