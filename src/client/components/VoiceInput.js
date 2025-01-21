import React, { useState, useCallback, useRef, useEffect } from 'react';
import './VoiceInput.css';

function VoiceInput({ onTranscript, disabled }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const requestMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error('Microphone permission denied:', err);
            setError('Please allow microphone access to use voice input.');
            return false;
        }
    };

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const startListening = useCallback(async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Voice recognition is not supported in your browser. Please use Chrome or Safari.");
            return;
        }

        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) return;

        try {
            const recognition = new SpeechRecognition();

            recognition.continuous = !isMobile;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
                setCurrentTranscript('');
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    setError("No speech detected. Please try speaking again.");
                } else if (event.error === 'network') {
                    setError("Network error. Please check your connection.");
                } else if (event.error === 'not-allowed') {
                    setError("Microphone access denied. Please allow microphone access.");
                } else {
                    setError(`Error: ${event.error}`);
                }
                stopRecognition();
            };

            recognition.onend = () => {
                if (currentTranscript.trim()) {
                    // Only send non-empty transcripts
                    onTranscript(currentTranscript.trim());
                }
                stopRecognition();
            };

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join(' ');
                
                setCurrentTranscript(transcript);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Error initializing speech recognition:', err);
            setError('Failed to start voice recognition. Please try again.');
        }
    }, [onTranscript, stopRecognition, isMobile]);

    const handleToggle = useCallback(async (e) => {
        e.preventDefault();
        
        if (isListening) {
            stopRecognition();
        } else {
            await startListening();
        }
    }, [isListening, startListening, stopRecognition]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return (
        <div className="voice-input">
            <button 
                className={`voice-button ${isListening ? 'listening' : ''} ${isMobile ? 'mobile' : ''}`}
                onClick={handleToggle}
                onTouchStart={(e) => e.preventDefault()}
                disabled={disabled}
                title={disabled ? "Please connect to Google Calendar first" : "Tap to start/stop voice input"}
            >
                <span className="microphone-icon">
                    {isListening ? '🔴' : '🎤'}
                </span>
                {isListening ? 'Stop Recording' : 'Start Voice Input'}
            </button>
            {error && <div className="voice-error">{error}</div>}
            {isListening && (
                <div className="listening-indicator">
                    {isMobile ? 'Tap to stop when finished' : 'Recording... Click stop when done'}
                    <div className="recording-pulse"></div>
                </div>
            )}
            {currentTranscript && (
                <div className="interim-transcript">
                    {currentTranscript}
                </div>
            )}
        </div>
    );
}

export default VoiceInput; 
