import { useEffect } from "react";

function Modal({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(5, 9, 7, 0.66)",
                backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "20px",
                animation: "fadeIn 0.2s var(--ease) both",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="card"
                style={{
                    width: "100%", maxWidth: 520,
                    maxHeight: "90vh", overflowY: "auto",
                    padding: "32px",
                    animation: "fadeUp 0.3s var(--ease) both",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1, padding: "4px 8px" }}
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default Modal;
