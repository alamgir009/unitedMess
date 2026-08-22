/**
 * Generate an ICS (iCalendar) file buffer for market duty dates.
 * Compatible with Google Calendar, Apple Calendar, Outlook, and most clients.
 */

const crypto = require('crypto');

const pad = (n) => String(n).padStart(2, '0');

const toICSDate = (date) => {
    const d = new Date(date);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const escapeICS = (text) =>
    String(text)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');

/**
 * Generate a single .ics buffer for one or more market duty dates.
 * @param {Object} params
 * @param {string} params.userName - Name of the member on duty
 * @param {Array<{date: Date|string}>} params.dates - Array of duty dates
 * @param {string} [params.description] - Event description
 * @returns {Buffer} .ics file content as Buffer
 */
const generateMarketDutyICS = ({ userName, dates, description }) => {
    const now = toICSDate(new Date());
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//UnitedMess//Market Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:UnitedMess Market Duty',
        'X-WR-TIMEZONE:Asia/Kolkata',
    ];

    for (const entry of dates) {
        const dutyDate = new Date(entry.date);
        const y = dutyDate.getUTCFullYear();
        const m = dutyDate.getUTCMonth();
        const d = dutyDate.getUTCDate();

        const start = new Date(Date.UTC(y, m, d, 9, 0, 0));
        const end = new Date(Date.UTC(y, m, d, 18, 0, 0));
        const uid = crypto.randomUUID();

        const eventSummary = escapeICS(`Market Duty - ${userName}`);
        const eventDesc = escapeICS(
            description || `You are on market duty on ${dutyDate.toDateString()}. Managed by UnitedMess.`
        );

        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${now}`,
            `DTSTART:${toICSDate(start)}`,
            `DTEND:${toICSDate(end)}`,
            `SUMMARY:${eventSummary}`,
            `DESCRIPTION:${eventDesc}`,
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'TRIGGER:-PT60M',
            'ACTION:DISPLAY',
            'DESCRIPTION:Market duty starts in 1 hour',
            'END:VALARM',
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            'DESCRIPTION:Market duty tomorrow',
            'END:VALARM',
            'END:VEVENT'
        );
    }

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');
    return Buffer.from(icsContent, 'utf-8');
};

module.exports = { generateMarketDutyICS };
