import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { connectSocket } from '../services/socketService';
import { getCardsByDeck, evaluateAnswer } from '../services/dashboardService';
import './StudySession.css';

const StudySession = ({ deck, username, onActiveChange }) => {
    const [joined, setJoined] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [events, setEvents] = useState([]);
    const [allCards, setAllCards] = useState([]);
    const [studyQueue, setStudyQueue] = useState([]);
    const [missedQueue, setMissedQueue] = useState([]);
    const [round, setRound] = useState(1);
    const [sessionDone, setSessionDone] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);

    const [userAnswer, setUserAnswer] = useState('');
    const [gradeResult, setGradeResult] = useState(null);
    const [grading, setGrading] = useState(false);

    const socketRef = useRef(null);
    const textareaRef = useRef(null);

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

    useEffect(() => {
        return () => onActiveChange?.(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keyboard shortcuts: Space/Enter → check answer; Arrow keys → rate when flipped.
    useEffect(() => {
        if (!joined || sessionDone || studyQueue.length === 0) return;

        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                handleCheckAnswer();
            } else if (flipped && !grading && e.key === 'ArrowRight') {
                e.preventDefault();
                handleRate(true);
            } else if (flipped && !grading && e.key === 'ArrowLeft') {
                e.preventDefault();
                handleRate(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joined, sessionDone, studyQueue, currentIndex, flipped, grading, userAnswer, missedQueue, round]);

    const addEvent = (text) =>
        setEvents((prev) => [{ text, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));

    const resetCardState = () => {
        setFlipped(false);
        setUserAnswer('');
        setGradeResult(null);
        setGrading(false);
    };

    const joinSession = async () => {
        let deckCards = [];
        try {
            deckCards = await getCardsByDeck(deck.id ?? deck.deckId);
        } catch {
            deckCards = [];
        }

        setAllCards(deckCards);
        setStudyQueue(deckCards);
        setMissedQueue([]);
        setRound(1);
        setSessionDone(false);
        resetCardState();

        socketRef.current.emit('join-session', { deckId: deck.id, deckTitle: deck.title, username });
        setJoined(true);
        setCurrentIndex(0);
        addEvent('You joined the session');
        onActiveChange?.(true);
    };

    const leaveSession = () => {
        socketRef.current.emit('leave-session', { deckId: deck.id });
        setJoined(false);
        setParticipants([]);
        resetCardState();
        addEvent('You left the session');
        onActiveChange?.(false);
    };

    const studyAgain = () => {
        setStudyQueue(allCards);
        setMissedQueue([]);
        setRound(1);
        setSessionDone(false);
        setCurrentIndex(0);
        resetCardState();
        addEvent('Restarted the deck from round 1');
    };

    const handleFlip = () => {
        if (flipped) return;
        setFlipped(true);
        socketRef.current.emit('card-flipped', {
            deckId: deck.id,
            cardIndex: currentIndex,
            totalCards: studyQueue.length,
            username
        });
    };

    const handleCheckAnswer = async () => {
        const trimmed = userAnswer.trim();

        if (!trimmed) {
            handleFlip();
            return;
        }

        setGrading(true);
        setFlipped(true);
        socketRef.current.emit('card-flipped', {
            deckId: deck.id,
            cardIndex: currentIndex,
            totalCards: studyQueue.length,
            username
        });

        try {
            const result = await evaluateAnswer(trimmed, studyQueue[currentIndex].answer);
            setGradeResult(result);
        } catch {
            setGradeResult(null);
        } finally {
            setGrading(false);
        }
    };

    const handleRate = (gotIt) => {
        const card = studyQueue[currentIndex];
        const updatedMissed = gotIt ? missedQueue : [...missedQueue, card];
        const nextIndex = currentIndex + 1;
        resetCardState();

        if (nextIndex >= studyQueue.length) {
            if (updatedMissed.length > 0) {
                addEvent(`Round ${round} done — reviewing ${updatedMissed.length} missed card${updatedMissed.length === 1 ? '' : 's'}`);
                setStudyQueue(updatedMissed);
                setMissedQueue([]);
                setRound((r) => r + 1);
                setCurrentIndex(0);
            } else {
                setSessionDone(true);
                socketRef.current.emit('session-complete', { deckId: deck.id, username });
                addEvent('🎉 You mastered every card in this deck!');
            }
        } else {
            setMissedQueue(updatedMissed);
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
                    {studyQueue.length === 0 && !sessionDone ? (
                        <p className="study-session-empty">This deck has no cards yet.</p>
                    ) : sessionDone ? (
                        <div className="study-session-complete">
                            <span className="study-session-complete-icon">🎉</span>
                            <p>You mastered all {allCards.length} card{allCards.length === 1 ? '' : 's'} in {round} round{round === 1 ? '' : 's'}!</p>
                            <button className="study-btn study-btn-flip" onClick={studyAgain}>Study Again</button>
                        </div>
                    ) : (
                        <>
                            <div className="study-session-progress">
                                Card {currentIndex + 1} of {studyQueue.length}
                                {round > 1 && <span className="study-session-round-badge">Round {round}</span>}
                            </div>

                            <div
                                className={`study-flashcard ${flipped ? 'study-flashcard-flipped' : ''}`}
                                onClick={!flipped ? handleFlip : undefined}
                            >
                                <div className="study-flashcard-inner">
                                    <div className="study-flashcard-face study-flashcard-front">
                                        <span className="study-flashcard-label">Q</span>
                                        <div className="study-flashcard-content">
                                            <ReactMarkdown>{studyQueue[currentIndex].question}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="study-flashcard-face study-flashcard-back">
                                        <span className="study-flashcard-label study-flashcard-label--a">A</span>
                                        <div className="study-flashcard-content">
                                            <ReactMarkdown>{studyQueue[currentIndex].answer}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {!flipped ? (
                                <div className="study-answer-area">
                                    <textarea
                                        ref={textareaRef}
                                        className="study-answer-input"
                                        placeholder="Type your answer here, then click Check — or leave blank to just flip the card"
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleCheckAnswer();
                                            }
                                        }}
                                        rows={2}
                                    />
                                    <button
                                        className="study-btn study-btn-flip"
                                        onClick={handleCheckAnswer}
                                    >
                                        {userAnswer.trim() ? 'Check Answer' : 'Show Answer'}
                                        {!userAnswer.trim() && <span className="study-session-key-hint">space</span>}
                                    </button>
                                </div>
                            ) : (
                                <div className="study-session-controls-flipped">
                                    {grading && (
                                        <div className="study-grading">
                                            <span className="study-grading-spinner" /> AI is evaluating your answer…
                                        </div>
                                    )}
                                    {gradeResult && !grading && (
                                        <div className={`study-grade-result study-grade-result--${gradeResult.correct ? 'correct' : 'incorrect'}`}>
                                            {gradeResult.correct ? '✅ Correct' : '❌ Incorrect'} — {gradeResult.feedback}
                                        </div>
                                    )}
                                    <div className="study-session-controls">
                                        <button className="study-btn study-btn-miss" onClick={() => handleRate(false)}>
                                            ❌ Still learning <span className="study-session-key-hint">←</span>
                                        </button>
                                        <button className="study-btn study-btn-next" onClick={() => handleRate(true)}>
                                            ✅ Got it <span className="study-session-key-hint">→</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

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
