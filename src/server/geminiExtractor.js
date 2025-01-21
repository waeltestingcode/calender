const { GoogleGenerativeAI } = require("@google/generative-ai");
const { 
    parse, 
    addDays, 
    addWeeks, 
    setHours, 
    setMinutes, 
    startOfDay,
    getDay,
    format 
} = require('date-fns');
const { zonedTimeToUtc, utcToZonedTime } = require('date-fns-tz');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Map of day names to numbers
const DAYS = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
};

// Map of month names to numbers
const MONTHS = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
};

async function extractEventsWithGemini(text, timezone) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `Analyze the following text and extract ALL events, meetings, deadlines, and activities.
Look for phrases like "I have to", "I will", "I need to", "going to", etc.

For each event, format EXACTLY as:
Event Title: [Event Name]
Date: [Date - be specific and include year if mentioned]
Time: [Time in 12-hour format with AM/PM]
Details: [Any additional details, requirements, or description]

Important:
- Extract EVERY single event mentioned
- Look for intent phrases like "I will", "I have to", "need to", "going to"
- Convert casual mentions into proper events
- Keep original date/time format from the text
- Include ALL details and context
- For assignments, include both opening and due times
- For meetings, include location and attendees
- If multiple events share the same date, specify "same as above" for the date

Example inputs and responses:

Input: "I will eat sushi on friday"
Response:
Event Title: Sushi Meal
Date: friday
Time: 12:00 PM
Details: N/A

Input: "I have to submit the report by next monday 3pm"
Response:
Event Title: Report Submission
Date: next monday
Time: 3:00 PM
Details: Deadline for report submission

Input: "going to the gym tomorrow morning"
Response:
Event Title: Gym Session
Date: tomorrow
Time: 9:00 AM
Details: N/A

Text to analyze:
${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Gemini Response:", response.text());

        // If no time is specified in the response, try to extract intent-based default times
        const events = parseEventText(response.text(), timezone, text);

        if (events.length === 0) {
            throw new Error("No events could be extracted from the text");
        }

        return events.map(event => createCalendarEvent(event, timezone));
    } catch (error) {
        console.error('Error in Gemini extraction:', error);
        throw new Error(`Failed to extract events: ${error.message}`);
    }
}

function parseEventText(text, timezone, originalText) {
    const events = [];
    const eventBlocks = text.split(/(?=Event Title:|Title:)/i).filter(block => block.trim());
    let lastDate = null;

    // Common time indicators in the original text
    const timeIndicators = {
        'morning': '9:00 AM',
        'afternoon': '2:00 PM',
        'evening': '6:00 PM',
        'night': '8:00 PM',
        'lunch': '12:00 PM',
        'dinner': '7:00 PM',
        'breakfast': '8:00 AM'
    };

    for (const block of eventBlocks) {
        try {
            const titleMatch = block.match(/(?:Event )?Title:\s*(.+?)(?:\n|$)/i);
            const dateMatch = block.match(/Date:\s*(.+?)(?:\n|$)/i);
            const timeMatch = block.match(/Time:\s*(.+?)(?:\n|$)/i);
            const detailsMatch = block.match(/Details:\s*([^]*?)(?=(?:Event Title:|Title:)|$)/i);

            if (titleMatch) {
                const title = titleMatch[1].trim();
                const details = detailsMatch ? detailsMatch[1].trim() : '';
                
                // Handle date
                let dateStr = dateMatch ? dateMatch[1].trim() : '';
                if (dateStr.toLowerCase().includes('same as above') && lastDate) {
                    dateStr = lastDate;
                } else if (dateStr) {
                    lastDate = dateStr;
                }

                // Try to infer time from context if not specified
                let timeStr = timeMatch ? timeMatch[1].trim() : '';
                if (timeStr === '12:00 PM' || !timeStr) {
                    const lowerOriginal = originalText.toLowerCase();
                    for (const [indicator, defaultTime] of Object.entries(timeIndicators)) {
                        if (lowerOriginal.includes(indicator)) {
                            timeStr = defaultTime;
                            break;
                        }
                    }
                }

                const date = parseDateTimeString(dateStr, timeStr || '12:00 PM', timezone);

                if (date) {
                    const isDeadline = 
                        title.toLowerCase().includes('deadline') ||
                        title.toLowerCase().includes('due') ||
                        title.toLowerCase().includes('submission') ||
                        details.toLowerCase().includes('deadline') ||
                        details.toLowerCase().includes('due');

                    events.push({
                        type: isDeadline ? 'deadline' : 'event',
                        title,
                        date,
                        details
                    });
                }
            }
        } catch (error) {
            console.warn('Error parsing event block:', error);
        }
    }

    return events;
}

function parseDateTimeString(dateStr, timeStr, timezone) {
    try {
        if (!dateStr || dateStr.toLowerCase() === 'n/a') {
            return null;
        }

        const now = new Date();
        let targetDate = new Date(now);
        dateStr = dateStr.toLowerCase().trim();
        timeStr = timeStr.toLowerCase().trim();

        // Handle relative dates
        if (dateStr.includes('today')) {
            targetDate = startOfDay(now);
        } else if (dateStr.includes('after tomorrow') || dateStr.includes('day after tomorrow')) {
            // Handle "after tomorrow" - add 2 days
            targetDate = startOfDay(addDays(now, 2));
        } else if (dateStr.includes('tomorrow')) {
            // Handle "tomorrow" - must come after "after tomorrow" check
            targetDate = startOfDay(addDays(now, 1));
        } else if (dateStr.includes('next week')) {
            targetDate = startOfDay(addWeeks(now, 1));
        } else if (dateStr.includes('next')) {
            // Handle "next Tuesday" type dates
            const dayMatch = Object.keys(DAYS).find(day => dateStr.includes(day));
            if (dayMatch) {
                const targetDay = DAYS[dayMatch];
                const currentDay = getDay(now);
                const daysToAdd = (targetDay - currentDay + 7) % 7;
                targetDate = startOfDay(addDays(now, daysToAdd));
            }
        } else {
            // Handle explicit dates
            const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (ddmmyyyyMatch) {
                const [_, day, month, year] = ddmmyyyyMatch;
                targetDate = new Date(year, month - 1, day);
            } else {
                // Try parsing month name formats
                const monthMatch = Object.keys(MONTHS).find(month => dateStr.includes(month));
                if (monthMatch) {
                    const month = MONTHS[monthMatch];
                    const dayMatch = dateStr.match(/\d{1,2}/);
                    const yearMatch = dateStr.match(/\d{4}/);
                    const day = dayMatch ? parseInt(dayMatch[0]) : 1;
                    const year = yearMatch ? parseInt(yearMatch[0]) : now.getFullYear();
                    targetDate = new Date(year, month, day);
                }
            }
        }

        // Parse time
        if (timeStr && timeStr !== 'n/a') {
            const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3]?.toLowerCase();

                if (period === 'pm' && hours < 12) hours += 12;
                if (period === 'am' && hours === 12) hours = 0;

                targetDate = setHours(setMinutes(targetDate, minutes), hours);
            }
        }

        return targetDate;
    } catch (error) {
        console.warn('Date parsing error:', error);
        return null;
    }
}

function createCalendarEvent(event, timezone) {
    const eventDate = event.date;
    
    // Create dates directly in the user's timezone without UTC conversion
    const startDate = new Date(eventDate);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + (event.type === 'deadline' ? 0 : 1));

    // Format the dates as ISO strings but preserve the timezone
    const formatToISO = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:00`;
    };

    return {
        summary: event.type === 'deadline' ? `⚠️ DUE: ${event.title}` : `🗓️ ${event.title}`,
        description: event.details || '',
        start: {
            dateTime: formatToISO(startDate),
            timeZone: timezone
        },
        end: {
            dateTime: formatToISO(endDate),
            timeZone: timezone
        }
    };
}

module.exports = { extractEventsWithGemini };
