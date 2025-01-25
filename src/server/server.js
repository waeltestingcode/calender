const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const { extractEventsWithGemini } = require('./geminiExtractor');

const app = express();
app.use(cors({
    origin: '*',  // Allow all origins for now
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Store tokens in memory (for development)
let storedTokens = null;

const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Google Calendar API setup
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Auth endpoint to get Google OAuth URL
app.get('/api/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar']
    });
    res.json({ url });
});

// Callback endpoint for Google OAuth
app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        storedTokens = tokens; // Store tokens
        oauth2Client.setCredentials(tokens);
        const redirectUrl = process.env.NODE_ENV === 'production' 
            ? 'https://calenderautomation.vercel.app'
            : 'http://localhost:1234';
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.status(500).json({ error: 'Failed to get tokens' });
    }
});

// Update the root route handler as well
app.get('/', (req, res) => {
    const redirectUrl = process.env.NODE_ENV === 'production' 
        ? 'https://calenderautomation.vercel.app'
        : 'http://localhost:1234';
    res.redirect(redirectUrl);
});

// Endpoint to process text and create events
app.post('/api/process-events', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Create a new OAuth2Client with the token
        const oauth2Client = new OAuth2Client();
        oauth2Client.setCredentials({ access_token: token });

        // Get user timezone
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const userTimeZone = await getUserTimeZone(calendar);
        console.log('User timezone:', userTimeZone);

        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const events = await extractEventsWithGemini(text, userTimeZone);
        
        if (!events || events.length === 0) {
            return res.status(400).json({ 
                error: 'No valid events found in the text.'
            });
        }

        res.json({ success: true, events: events });
    } catch (error) {
        console.error('Error processing events:', error);
        res.status(500).json({ 
            error: 'Failed to process events',
            details: error.message 
        });
    }
});

// Update auth check endpoint
app.get('/api/auth/check', (req, res) => {
    try {
        res.json({ 
            isAuthenticated: Boolean(storedTokens && storedTokens.access_token)
        });
    } catch (error) {
        res.json({ isAuthenticated: false });
    }
});

// Update create-events endpoint
app.post('/api/create-events', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Create a new OAuth2Client with the token
        const oauth2Client = new OAuth2Client();
        oauth2Client.setCredentials({ access_token: token });
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const { events } = req.body;

        const createdEvents = await Promise.all(
            events.map(event => 
                calendar.events.insert({
                    calendarId: 'primary',
                    resource: event
                })
            )
        );

        res.json({ success: true, events: createdEvents });
    } catch (error) {
        console.error('Error creating events:', error);
        res.status(500).json({ 
            error: 'Failed to create events',
            details: error.message 
        });
    }
});

// Add this function to get user's timezone with fallback
async function getUserTimeZone(calendar) {
    try {
        const settings = await calendar.settings.get({
            setting: 'timezone'
        });
        return settings.data.value;
    } catch (error) {
        console.warn('Error getting user timezone:', error);
        return 'UTC'; // Default to UTC if we can't get user's timezone
    }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
