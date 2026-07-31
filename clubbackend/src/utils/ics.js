/* Minimal iCalendar (.ics) generator — no dependency needed. Produces a
   single VEVENT that Google/Apple/Outlook calendars can import. */

// iCal wants UTC timestamps as YYYYMMDDTHHMMSSZ
const toICSDate = (date) =>
    new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Escape per RFC 5545: backslash, comma, semicolon, newlines
const esc = (str = "") =>
    String(str)
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");

export const buildEventICS = (event) => {
    const start = toICSDate(event.eventDate);
    // Default 2-hour duration since events don't store an end time
    const end = toICSDate(new Date(new Date(event.eventDate).getTime() + 2 * 60 * 60 * 1000));
    const stamp = toICSDate(new Date());

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Club App//Events//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:event-${event._id}@clubapp`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${esc(event.title)}`,
        `DESCRIPTION:${esc(event.description)}`,
        `LOCATION:${esc(event.venue)}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ];

    // RFC 5545 requires CRLF line endings
    return lines.join("\r\n");
};
