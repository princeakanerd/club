/* Design tokens ported from the web app (clubfrontend/src/index.css) so the
   mobile app feels like the same product — a dark maroon / rust / ivory
   editorial look. */
export const colors = {
    bg: "#1a0a0e", // forest-deep — page background
    surface: "#1e1014", // card surface
    surfaceRaised: "#271419", // subtle raised fill
    ink: "#f5efe9", // primary text / headings
    inkSoft: "#d4c3c1", // body text
    muted: "#968083", // secondary text
    line: "rgba(245, 239, 233, 0.1)", // hairline borders
    rust: "#d2a948", // primary accent (gold)
    rustDark: "#e8c46b",
    rustSoft: "rgba(210, 169, 72, 0.16)",
    forest: "#5e2330", // deep maroon
    ivory: "#f3f1ec",
    danger: "#e06a5a",
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
};

export const font = {
    // React Native ships system fonts; sizes mirror the web scale
    h1: 30,
    h2: 22,
    h3: 18,
    body: 15,
    small: 13,
    tiny: 11,
};
