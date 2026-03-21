import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiX, FiSend, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { config } from '../../config';
import './ChatBot.css';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'model',
            content: 'Hi! I am your AI Financial Assistant. Ask me about your expenses, income, or budget!',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const userMessage = { role: 'user', content: inputValue.trim(), timestamp: currentTime };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${config.SERVER_URL}/api/chat`,
                {
                    message: userMessage.content,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const botMessage = {
                role: 'model',
                content: response.data.response,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chat Error:", error);
            const errorMessage = {
                role: 'model',
                content: "Sorry, I encountered an error. Please check your API key or try again later.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-widget-container">
            {isOpen && (
                <div className={`chat-window ${isMaximized ? 'maximized' : ''}`}>
                    <div className="chat-header">
                        <div className="header-title-area">
                            <img src="/chatbot_logo.png" alt="AI Agent Logo" className="header-logo" />
                            <h3>Financial Assistant</h3>
                        </div>
                        <div className="header-actions">
                            <button className="chat-header-btn" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? "Minimize" : "Maximize"}>
                                {isMaximized ? <FiMinimize2 /> : <FiMaximize2 />}
                            </button>
                            <button className="chat-header-btn close-btn" onClick={() => setIsOpen(false)} title="Close">
                                <FiX />
                            </button>
                        </div>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role}`}>
                                {msg.content}
                                {msg.timestamp && <span className="message-timestamp">{msg.timestamp}</span>}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="typing-indicator">
                                AI is thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-area" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Ask about your finances..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" className="send-btn" disabled={isLoading || !inputValue.trim()}>
                            <FiSend />
                        </button>
                    </form>
                </div>
            )}

            <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FiX /> : <FiMessageSquare />}
            </button>
        </div>
    );
};

export default ChatWidget;
