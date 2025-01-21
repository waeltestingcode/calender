const { extractEventsFromText } = require('./eventExtractor');

const testText = `
I have a meeting with John on 12/25/2024.
Need to attend the conference on 01/15/2024.
Birthday party at Sarah's place on 03/20/2024.
`;

const events = extractEventsFromText(testText);
console.log('Extracted Events:', JSON.stringify(events, null, 2)); 