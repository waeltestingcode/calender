import React, { useState } from 'react';
import './EventConfirmationModal.css';

function EventConfirmationModal({ events, onConfirm, onCancel }) {
    const [selectedEvents, setSelectedEvents] = useState(events.map((_, index) => index));
    const [editingEvent, setEditingEvent] = useState(null);
    const [editedEvents, setEditedEvents] = useState([...events]);

    const handleCheckboxChange = (index) => {
        setSelectedEvents(prev => 
            prev.includes(index) 
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleEditEvent = (index) => {
        setEditingEvent(index);
    };

    const handleSaveEdit = (index) => {
        setEditingEvent(null);
    };

    const handleEventChange = (index, field, value) => {
        setEditedEvents(prev => {
            const newEvents = [...prev];
            if (field === 'start') {
                // Convert the input datetime-local value to local timezone
                const localDate = new Date(value);
                
                // Create end date 1 hour later
                const endDate = new Date(localDate);
                endDate.setHours(endDate.getHours() + 1);

                newEvents[index] = {
                    ...newEvents[index],
                    start: {
                        dateTime: localDate.toISOString().slice(0, -1),
                        timeZone: newEvents[index].start.timeZone
                    },
                    end: {
                        dateTime: endDate.toISOString().slice(0, -1),
                        timeZone: newEvents[index].end.timeZone
                    }
                };
            } else if (field === 'summary' || field === 'description') {
                newEvents[index] = {
                    ...newEvents[index],
                    [field]: value
                };
            }
            return newEvents;
        });
    };

    const handleConfirm = () => {
        const confirmedEvents = selectedEvents
            .sort((a, b) => a - b)
            .map(index => editedEvents[index]);
        onConfirm(confirmedEvents);
    };

    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    const formatDateForInput = (dateTimeStr) => {
        try {
            // Convert the date string to local date
            const date = new Date(dateTimeStr);
            // Format as YYYY-MM-DDTHH:mm
            return date.toLocaleString('sv', { // 'sv' locale gives us ISO format
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(' ', 'T');
        } catch (error) {
            console.error('Error formatting date for input:', error);
            return '';
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Confirm Events</h2>
                <p>The following events will be added to your calendar:</p>
                
                <div className="events-list">
                    {editedEvents.map((event, index) => (
                        <div key={index} className="event-item">
                            <div className="event-header">
                                <input
                                    type="checkbox"
                                    checked={selectedEvents.includes(index)}
                                    onChange={() => handleCheckboxChange(index)}
                                />
                                {editingEvent === index ? (
                                    <button 
                                        className="save-button"
                                        onClick={() => handleSaveEdit(index)}
                                    >
                                        Save
                                    </button>
                                ) : (
                                    <button 
                                        className="edit-button"
                                        onClick={() => handleEditEvent(index)}
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                            
                            {editingEvent === index ? (
                                <div className="event-edit-form">
                                    <input
                                        type="text"
                                        value={event.summary || ''}
                                        onChange={(e) => handleEventChange(index, 'summary', e.target.value)}
                                        placeholder="Event Title"
                                    />
                                    <input
                                        type="datetime-local"
                                        value={event.start?.dateTime ? formatDateForInput(event.start.dateTime) : ''}
                                        onChange={(e) => handleEventChange(index, 'start', e.target.value)}
                                    />
                                    <textarea
                                        value={event.description || ''}
                                        onChange={(e) => handleEventChange(index, 'description', e.target.value)}
                                        placeholder="Description"
                                    />
                                </div>
                            ) : (
                                <div className="event-details">
                                    <h3>{event.summary}</h3>
                                    <p className="event-time">
                                        {event.start?.dateTime ? formatDate(event.start.dateTime) : 'Time not set'}
                                    </p>
                                    {event.description && (
                                        <p className="event-description">{event.description}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="modal-actions">
                    <button className="cancel-button" onClick={onCancel}>
                        Cancel
                    </button>
                    <button 
                        className="confirm-button" 
                        onClick={handleConfirm}
                        disabled={selectedEvents.length === 0}
                    >
                        Add Selected Events
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EventConfirmationModal; 