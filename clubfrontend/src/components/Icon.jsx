/* Minimal stroke-based line icons — inherit color via currentColor.
   Replaces emojis for a refined, professional look. */

const paths = {
    clubs: <><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M9 21v-5h6v5" /><path d="M9 11h.01M15 11h.01" /></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    ticket: <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" /><path d="M13 6v12" strokeDasharray="2 3" /></>,
    message: <><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" /></>,
    connect: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-1a5 5 0 0 1 5-5h2" /><circle cx="17" cy="10" r="3" /><path d="M21 21v-1a4 4 0 0 0-3-3.87" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    megaphone: <><path d="m3 11 14-6v14L3 13v-2Z" /><path d="M17 9a3 3 0 0 1 0 6" /><path d="M7 13v4a2 2 0 0 0 2 2h1" /></>,
    location: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
    heart: <path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 17.5 4c-1.7 0-3 1-4 2-1-1-2.3-2-4-2A4.5 4.5 0 0 0 1 8.5C1 10.7 2.5 12.5 4 14l8 8 7-8Z" transform="scale(0.92) translate(1 0)" />,
    chat: <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />,
    check: <path d="M20 6 9 17l-5-5" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
    grad: <><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" /></>,
    star: <path d="M12 3.5 14.6 9l6 .5-4.5 4 1.4 5.9L12 16.3 6.5 19.4 7.9 13.5 3.4 9.5l6-.5L12 3.5Z" />,
    sprout: <><path d="M12 22V11" /><path d="M12 11C12 7 9 4 4 4c0 5 3 7 8 7Z" /><path d="M12 13c0-3 2.5-5 6.5-5 0 4-2.5 5-6.5 5Z" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 5h14l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3-7Z" /></>,
    wave: <path d="M4 14s1.5-2 4-2 4 2 4 2 1.5-2 4-2 4 2 4 2" />,
    members: <><circle cx="9" cy="7" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><path d="M21 20v-1a4 4 0 0 0-3-3.8" /></>,
};

export default function Icon({ name, size = 18, stroke = 1.6, style, className }) {
    const d = paths[name];
    if (!d) return null;
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, display: "block", ...style }}
            aria-hidden="true"
        >
            {d}
        </svg>
    );
}
