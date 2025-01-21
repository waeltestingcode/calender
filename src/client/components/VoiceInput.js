import React, { useState, useCallback, useRef, useEffect } from 'react';
import './VoiceInput.css';

function VoiceInput({ onTranscript, disabled }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const requestMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
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
        setInterimTranscript('');
    }, []);

    const startListening = useCallback(async () => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Voice recognition is not supported in your browser. Please use Chrome or Safari.");
            return;
        }

        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) return;

        try {
            const recognition = new SpeechRecognition();

            // Mobile-optimized configuration
            recognition.continuous = !isMobile; // Set to false on mobile for better performance
            recognition.interimResults = true;
            recognition.maxAlternatives = 3;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
                setFinalTranscript('');
                setInterimTranscript('');
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
                const finalText = finalTranscript || interimTranscript;
                if (finalText.trim()) {
                    onTranscript(finalText);
                }
                
                if (isMobile) {
                    stopRecognition();
                } else if (isListening) {
                    // Only restart on desktop if still listening
                    recognition.start();
                }
            };

            recognition.onresult = (event) => {
                let interim = '';
                let final = '';

                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        final += result[0].transcript;
                    } else {
                        interim += result[0].transcript;
                    }
                }

                setInterimTranscript(interim);
                if (final) {
                    setFinalTranscript(prev => prev + ' ' + final);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Error initializing speech recognition:', err);
            setError('Failed to start voice recognition. Please try again.');
        }
    }, [onTranscript, stopRecognition, isListening, isMobile]);

    const handleToggle = useCallback(async (e) => {
        e.preventDefault(); // Prevent double-tap zoom on mobile
        
        if (isListening) {
            stopRecognition();
        } else {
            await startListening();
        }
    }, [isListening, startListening, stopRecognition]);

    // Cleanup on unmount
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
                onTouchStart={(e) => e.preventDefault()} // Prevent ghost clicks
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
            {interimTranscript && (
                <div className="interim-transcript">
                    {interimTranscript}
                </div>
            )}
        </div>
    );
}

export default VoiceInput; 
