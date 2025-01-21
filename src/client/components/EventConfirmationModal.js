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
            newEvents[index] = {
                ...newEvents[index],
                [field]: value
            };
            return newEvents;
        });
    };

    const handleConfirm = () => {
        const confirmedEvents = selectedEvents
            .sort((a, b) => a - b)
            .map(index => editedEvents[index]);
        onConfirm(confirmedEvents);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
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
                                        value={event.summary}
                                        onChange={(e) => handleEventChange(index, 'summary', e.target.value)}
                                        placeholder="Event Title"
                                    />
                                    <input
                                        type="datetime-local"
                                        value={new Date(event.start.dateTime).toISOString().slice(0, 16)}
                                        onChange={(e) => handleEventChange(index, 'start', {
                                            ...event.start,
                                            dateTime: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                    <textarea
                                        value={event.description}
                                        onChange={(e) => handleEventChange(index, 'description', e.target.value)}
                                        placeholder="Description"
                                    />
                                </div>
                            ) : (
                                <div className="event-details">
                                    <h3>{event.summary}</h3>
                                    <p className="event-time">
                                        {formatDate(event.start.dateTime)}
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