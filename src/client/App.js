import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import EventConfirmationModal from './components/EventConfirmationModal';
import VoiceInput from './components/VoiceInput';
import './styles.css';

function App() {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [extractedEvents, setExtractedEvents] = useState(null);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        // Check URL for userId parameter
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (userId) {
            // Store userId in localStorage
            localStorage.setItem('userId', userId);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        checkAuth();
    }, []);

    const checkAuth = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/check`, { userId });
            setIsAuthenticated(response.data.isAuthenticated);
            if (response.data.isAuthenticated) {
                setUserInfo(response.data.userInfo);
            } else {
                localStorage.removeItem('userId');
            }
        } catch (error) {
            setIsAuthenticated(false);
            localStorage.removeItem('userId');
        }
    };

    const handleLogout = async () => {
        const userId = localStorage.getItem('userId');
        if (userId) {
            try {
                await axios.post(`${API_BASE_URL}/api/auth/logout`, { userId });
                localStorage.removeItem('userId');
                setIsAuthenticated(false);
                setUserInfo(null);
                window.location.reload();
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const userId = localStorage.getItem('userId');
            const response = await axios.post(`${API_BASE_URL}/api/process-events`, { 
                text,
                userId 
            });
            setExtractedEvents(response.data.events);
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Error processing events. Please try again.';
            setMessage(`Error: ${errorMessage}`);
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEvents = async (confirmedEvents) => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/create-events`, { events: confirmedEvents });
            setMessage(`Successfully created ${response.data.events.length} events!`);
            setText('');
            setExtractedEvents(null);
        } catch (error) {
            setMessage(`Error: ${error.response?.data?.error || 'Failed to create events'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEvents = () => {
        setExtractedEvents(null);
    };

    const handleGoogleAuth = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/google`);
            window.location.href = response.data.url;
        } catch (error) {
            setMessage('Error initiating Google authentication');
            console.error('Error:', error);
        }
    };

    const handleVoiceTranscript = async (transcript) => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/process-events`, { text: transcript });
            setExtractedEvents(response.data.events);
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Error processing events. Please try again.';
            setMessage(`Error: ${errorMessage}`);
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleInputMode = () => {
        setIsVoiceMode(!isVoiceMode);
        setText('');
        setMessage('');
        setExtractedEvents(null);
    };

    return (
        <div className="app">
            <div className="container">
                <h1>Calendar Event Automator</h1>
                
                {isAuthenticated && userInfo && (
                    <div className="user-profile">
                        <div className="user-info">
                            <span className="user-email">{userInfo.email}</span>
                            <button 
                                className="logout-button"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
                
                {!isAuthenticated ? (
                    <div className="auth-section">
                        <p className="description">
                            Connect your Google Calendar to get started with automated event creation.
                        </p>
                        <button 
                            className="google-auth-button"
                            onClick={handleGoogleAuth}
                        >
                            Connect with Google Calendar
                        </button>
                    </div>
                ) : (
                    <div className="input-section">
                        <p className="description">
                            {isVoiceMode 
                                ? "Speak clearly to add events to your calendar." 
                                : "Type to add events to your calendar."}
                        </p>
                        
                        <div className="input-mode-toggle">
                            <button 
                                className={`mode-button ${!isVoiceMode ? 'active' : ''}`}
                                onClick={() => !isVoiceMode || toggleInputMode()}
                            >
                                ⌨️ Text Input
                            </button>
                            <button 
                                className={`mode-button ${isVoiceMode ? 'active' : ''}`}
                                onClick={() => isVoiceMode || toggleInputMode()}
                            >
                                🎤 Voice Input
                            </button>
                        </div>

                        {isVoiceMode ? (
                            <VoiceInput 
                                onTranscript={handleVoiceTranscript}
                                disabled={!isAuthenticated || loading}
                            />
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Example: Team meeting tomorrow at 3pm, then dinner at 8pm"
                                    rows={8}
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading || !text.trim()}
                                    className="submit-button"
                                >
                                    {loading ? (
                                        <span className="loading-spinner"></span>
                                    ) : (
                                        'Extract Events'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                )}
                
                {message && (
                    <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                {extractedEvents && (
                    <EventConfirmationModal
                        events={extractedEvents}
                        onConfirm={handleConfirmEvents}
                        onCancel={handleCancelEvents}
                    />
                )}
            </div>
        </div>
    );
}

export default App; 
