/* Editorial page header — gold letter-spaced kicker + oversized serif title.
   Gives every page the same crafted, cinematic feel as Explore/Dashboard. */

function PageHeader({ kicker, title, subtitle, right, accent }) {
    return (
        <div className="page-head fade-up">
            <div style={{ minWidth: 0 }}>
                {kicker && (
                    <p style={{ fontSize: 11.5, letterSpacing: "0.24em", color: "var(--rust)", margin: "0 0 14px", fontWeight: 700, textTransform: "uppercase" }}>
                        {kicker}
                    </p>
                )}
                <h1 style={{ fontSize: "clamp(36px, 5.5vw, 68px)", lineHeight: 1, letterSpacing: "-0.03em", margin: 0 }}>
                    {accent ? <>{title} <em style={{ fontStyle: "italic", color: "var(--rust)" }}>{accent}</em></> : title}
                </h1>
                {subtitle && (
                    <p style={{ color: "var(--muted)", fontSize: 16, margin: "16px 0 0", maxWidth: 520, lineHeight: 1.6 }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {right && <div style={{ flexShrink: 0 }}>{right}</div>}
        </div>
    );
}

export default PageHeader;
