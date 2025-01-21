import React, { useState } from 'react';
import './VoiceInput.css';

function VoiceInput({ onTranscript, disabled }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);

    const startListening = () => {
        if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
            setError("Voice recognition is not supported in your browser. Please use Chrome.");
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onerror = (event) => {
            setError(`Error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join(' ');
            
            onTranscript(transcript);
        };

        recognition.start();

        return recognition;
    };

    const toggleListening = () => {
        if (isListening) {
            window.recognition?.stop();
        } else {
            window.recognition = startListening();
        }
    };

    return (
        <div className="voice-input">
            <button 
                className={`voice-button ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
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
                    Listening... Speak clearly into your microphone
                </div>
            )}
        </div>
    );
}

export default VoiceInput; 