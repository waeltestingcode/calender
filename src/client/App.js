import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import EventConfirmationModal from './components/EventConfirmationModal';
import './styles.css';

function App() {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [extractedEvents, setExtractedEvents] = useState(null);

    useEffect(() => {
        // Check if user is authenticated
        const checkAuth = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/auth/check`);
                setIsAuthenticated(response.data.isAuthenticated);
            } catch (error) {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await axios.post(`${API_BASE_URL}/api/process-events`, { text });
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

    return (
        <div className="app">
            <div className="container">
                <h1>Calendar Event Automator</h1>
                
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
                            Paste your text below. We'll automatically extract events and add them to your calendar.
                        </p>
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