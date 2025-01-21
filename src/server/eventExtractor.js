const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

function extractEventsFromText(text) {
    try {
        // Split text into paragraphs
        const paragraphs = text.split(/\n+/);
        const events = [];
        
        // Regular expressions for different date formats
        const datePatterns = [
            // DD/MM/YYYY
            {
                regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
                parse: (match) => new Date(match[3], match[2] - 1, match[1])
            },
            // Monday, DD Month YYYY, HH:MM AM/PM
            {
                regex: /([A-Za-z]+day),\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
                parse: (match) => {
                    const months = {
                        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
                        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
                    };
                    const month = months[match[3].toLowerCase()];
                    let hours = parseInt(match[5]);
                    if (match[7].toLowerCase() === 'pm' && hours < 12) hours += 12;
                    if (match[7].toLowerCase() === 'am' && hours === 12) hours = 0;
                    return new Date(match[4], month, match[2], hours, parseInt(match[6]));
                }
            },
            // More patterns can be added here
        ];

        // Keywords that might indicate event titles
        const eventKeywords = ['opened', 'due', 'deadline', 'submission', 'assignment', 'project'];

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) continue;

            // Try each date pattern
            for (const pattern of datePatterns) {
                const dateMatch = paragraph.match(pattern.regex);
                if (dateMatch) {
                    const date = pattern.parse(dateMatch);
                    
                    // Skip if date is invalid
                    if (isNaN(date.getTime())) {
                        console.warn('Invalid date found:', dateMatch[0]);
                        continue;
                    }

                    // Extract title
                    let title = '';
                    const lines = paragraph.split('\n');
                    for (const line of lines) {
                        // Look for lines containing event keywords
                        if (eventKeywords.some(keyword => 
                            line.toLowerCase().includes(keyword.toLowerCase()))) {
                            title = line.replace(dateMatch[0], '').trim();
                            break;
                        }
                    }
                    
                    // If no specific title found, use the first line
                    if (!title) {
                        title = paragraph.split('\n')[0].replace(dateMatch[0], '').trim();
                    }

                    // Clean up the title
                    title = title
                        .replace(/^[:\-–—]+/, '') // Remove leading colons and dashes
                        .replace(/^(opened|due|deadline|submission):/i, '') // Remove common prefixes
                        .trim();

                    events.push({
                        summary: title || 'Untitled Event',
                        description: paragraph.trim(),
                        start: {
                            dateTime: date.toISOString(),
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        },
                        end: {
                            dateTime: new Date(date.getTime() + 60 * 60 * 1000).toISOString(),
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        }
                    });
                }
            }
        }
        
        return events;
    } catch (error) {
        console.error('Error in extractEventsFromText:', error);
        throw new Error(`Failed to extract events: ${error.message}`);
    }
}

module.exports = { extractEventsFromText }; 