import React, { useEffect, useRef, useState } from 'react';
import { getMessages } from '../services/chatService';
import { connectSocket } from '../services/socketService';
import './DeckChat.css';

const DeckChat = ({ deckId, user }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef(null);
    const socketRef = useRef(null);

    const username = user?.username || user?.firstName || 'User';
    const userId = user?.userId;

    useEffect(() => {
        getMessages(deckId)
            .then(setMessages)
            .catch(() => setMessages([]))
            .finally(() => setLoading(false));

        socketRef.current = connectSocket();
        const s = socketRef.current;

        s.emit('identify', { userId });
        s.emit('join-chat', { deckId });

        const handleNewMessage = (msg) => {
            if (String(msg.deckId) === String(deckId)) {
                setMessages(prev => [...prev, msg]);
            }
        };
        s.on('new-message', handleNewMessage);

        return () => {
            s.emit('leave-chat', { deckId });
            s.off('new-message', handleNewMessage);
        };
    }, [deckId, userId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        const text = input.trim();
        if (!text || !socketRef.current) return;
        socketRef.current.emit('send-message', { deckId, message: text, userId, username });
        setInput('');
    };

    return (
        <div className="dc">
            <div className="dc-header">💬 Deck Chat</div>
            <div className="dc-messages">
                {loading && <div className="dc-empty">Loading messages…</div>}
                {!loading && messages.length === 0 && (
                    <div className="dc-empty">No messages yet. Start the conversation!</div>
                )}
                {messages.map((msg, i) => {
                    const isMe = String(msg.userId) === String(userId);
                    return (
                        <div key={msg.id || i} className={`dc-msg ${isMe ? 'dc-msg--me' : 'dc-msg--them'}`}>
                            {!isMe && <span className="dc-msg-user">{msg.username || msg.sender?.username || 'User'}</span>}
                            <div className="dc-msg-bubble">{msg.message}</div>
                            <span className="dc-msg-time">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <div className="dc-input-row">
                <input
                    className="dc-input"
                    placeholder="Type a message…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button className="dc-send" onClick={handleSend} disabled={!input.trim()}>Send</button>
            </div>
        </div>
    );
};

export default DeckChat;
