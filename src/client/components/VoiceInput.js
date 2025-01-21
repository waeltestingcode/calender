import React, { useState, useCallback } from 'react';
import './VoiceInput.css';

function VoiceInput({ onTranscript, disabled }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const [recognition, setRecognition] = useState(null);
    const [finalTranscript, setFinalTranscript] = useState('');

    const stopRecognition = useCallback(() => {
        if (recognition) {
            recognition.stop();
            setRecognition(null);
        }
        setIsListening(false);
    }, [recognition]);

    const startListening = useCallback(() => {
        if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
            setError("Voice recognition is not supported in your browser. Please use Chrome.");
            return;
        }

        try {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            const newRecognition = new SpeechRecognition();

            newRecognition.continuous = false; // Changed to false for better reliability
            newRecognition.interimResults = false;
            newRecognition.maxAlternatives = 1;
            newRecognition.lang = 'en-US';

            newRecognition.onstart = () => {
                setIsListening(true);
                setError(null);
                setFinalTranscript('');
            };

            newRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setError(`Error: ${event.error}`);
                stopRecognition();
            };

            newRecognition.onend = () => {
                if (finalTranscript) {
                    onTranscript(finalTranscript);
                }
                stopRecognition();
            };

            newRecognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join(' ');
                setFinalTranscript(transcript);
            };

            setRecognition(newRecognition);
            newRecognition.start();
        } catch (err) {
            console.error('Error initializing speech recognition:', err);
            setError('Failed to start voice recognition. Please try again.');
        }
    }, [onTranscript, finalTranscript, stopRecognition]);

    const handleToggle = useCallback(() => {
        if (isListening) {
            stopRecognition();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopRecognition]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [recognition]);

    return (
        <div className="voice-input">
            <button 
                className={`voice-button ${isListening ? 'listening' : ''}`}
                onClick={handleToggle}
                disabled={disabled}
                title={disabled ? "Please connect to Google Calendar first" : "Click to start/stop voice input"}
            >
                <span className="microphone-icon">
                    {isListening ? '🔴' : '🎤'}
                </span>
                {isListening ? 'Stop Recording' : 'Start Voice Input'}
            </button>
            {error && <div className="voice-error">{error}</div>}
            {isListening && (
                <div className="listening-indicator">
                    Recording... Click stop when you're done speaking
                </div>
            )}
            <div className="voice-status">
                {isListening && (
                    <div className="recording-pulse"></div>
                )}
            </div>
        </div>
    );
}

export default VoiceInput; 
