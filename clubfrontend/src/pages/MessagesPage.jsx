import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";

/* ─── Helpers ──────────────────────────────────────── */
const fmt = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now - dt) / 86400000);
    if (diffDays === 0) return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

/* ─── Main Page ──────────────────────────────────────── */
function MessagesPage() {
    const { user: me } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [inbox, setInbox] = useState([]);
    const [inboxLoading, setInboxLoading] = useState(true);
    const [active, setActive] = useState(null); // { type:"DM"|"CLUB", id, name, avatar }
    const [messages, setMessages] = useState([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Load inbox
    const loadInbox = useCallback(() => {
        api.get("/messages/inbox")
            .then(r => setInbox(r.data.data))
            .catch(() => {})
            .finally(() => setInboxLoading(false));
    }, []);

    useEffect(() => {
        if (!me) { navigate("/login"); return; }
        loadInbox();
    }, [me]);

    // Handle ?dm=userId or ?club=clubId query params.
    // Depends on the actual param values (not inboxLoading) so it re-fires
    // whenever the user clicks "Message" on a different person/club while
    // already on this page.
    const dmParam = searchParams.get("dm");
    const clubParam = searchParams.get("club");
    useEffect(() => {
        if (inboxLoading) return;

        if (dmParam) {
            const existing = inbox.find(i => i.type === "DM" && i.partnerId?.toString() === dmParam);
            if (existing?.partner) {
                openDM(existing.partner);
            } else {
                api.get(`/users/${dmParam}/profile`).then(r => {
                    const p = r.data.data;
                    openDM({ _id: dmParam, fullName: p.fullName, username: p.username, avatar: p.avatar });
                }).catch(() => {});
            }
        } else if (clubParam) {
            const existing = inbox.find(i => i.type === "CLUB" && i.clubId?.toString() === clubParam);
            if (existing?.club) {
                openClub(existing.club, clubParam);
            } else {
                // Club is in user's joinedClubs but has no messages yet — fetch club info
                api.get(`/clubs/${clubParam}`).then(r => {
                    openClub(r.data.data, clubParam);
                }).catch(() => {});
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dmParam, clubParam, inboxLoading]);

    // Real-time socket listeners
    useEffect(() => {
        if (!socket) return;

        socket.on("new_dm", (msg) => {
            // Only append messages from OTHER people — own messages are added optimistically in handleSend
            const senderId = msg.sender._id?.toString() || msg.sender?.toString();
            if (senderId === me?._id?.toString()) return;
            if (active?.type === "DM" && (
                senderId === active.id
            )) {
                setMessages(prev => [...prev, msg]);
            }
            loadInbox();
        });

        socket.on("new_club_message", (msg) => {
            const senderId = msg.sender._id?.toString() || msg.sender?.toString();
            if (senderId === me?._id?.toString()) return;
            if (active?.type === "CLUB" && active.id === msg.clubId) {
                setMessages(prev => [...prev, msg]);
            }
            loadInbox();
        });

        return () => {
            socket.off("new_dm");
            socket.off("new_club_message");
        };
    }, [socket, active]);

    // Auto-scroll
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const openDM = (partner) => {
        setActive({ type: "DM", id: partner._id?.toString() || partner._id, name: partner.fullName, avatar: partner.avatar, username: partner.username });
        setMessages([]);
        setMsgLoading(true);
        api.get(`/messages/dm/${partner._id}`)
            .then(r => setMessages(r.data.data))
            .catch(() => {})
            .finally(() => setMsgLoading(false));
    };

    const openClub = (club, clubId) => {
        const id = clubId?.toString() || clubId;
        setActive({ type: "CLUB", id, name: club?.name, avatar: club?.logo });
        setMessages([]);
        setMsgLoading(true);
        // Join socket room
        socket?.emit("join_club", id);
        api.get(`/messages/club/${id}`)
            .then(r => setMessages(r.data.data))
            .catch(() => {})
            .finally(() => setMsgLoading(false));
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim() || !active) return;
        setSending(true);
        const content = text.trim();
        setText("");
        try {
            const url = active.type === "DM"
                ? `/messages/dm/${active.id}`
                : `/messages/club/${active.id}`;
            const res = await api.post(url, { content });
            setMessages(prev => [...prev, res.data.data]);
            loadInbox();
        } catch (err) {
            setText(content);
            alert(err.response?.data?.message || "Failed to send");
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    return (
        <div className="shell">
            <Navbar />
            <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
                {/* ── Sidebar ── */}
                <div style={{
                    width: 320,
                    flexShrink: 0,
                    borderRight: "1px solid var(--line)",
                    background: "var(--card)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}>
                    <div style={{ padding: "24px 20px 16px" }}>
                        <h2 style={{ fontSize: 22, margin: 0 }}>Messages</h2>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {inboxLoading && [...Array(4)].map((_, i) => (
                            <div key={i} style={{ padding: "12px 20px", display: "flex", gap: 12, alignItems: "center" }}>
                                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ height: 13, width: "60%", marginBottom: 6 }} />
                                    <div className="skeleton" style={{ height: 11, width: "80%" }} />
                                </div>
                            </div>
                        ))}
                        {!inboxLoading && inbox.length === 0 && (
                            <p style={{ padding: "20px", fontSize: 14, color: "var(--muted)" }}>
                                No conversations yet. Connect with someone to start a DM, or join a club for group chat.
                            </p>
                        )}
                        {!inboxLoading && inbox.map((item, i) => {
                            const isDM = item.type === "DM";
                            const name = isDM ? item.partner?.fullName : item.club?.name;
                            const avatar = isDM ? item.partner?.avatar : item.club?.logo;
                            const id = isDM ? item.partnerId?.toString() : item.clubId?.toString();
                            const isActive = active?.id === id;
                            return (
                                <div
                                    key={i}
                                    onClick={() => isDM ? openDM(item.partner) : openClub(item.club, item.clubId)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "12px 20px",
                                        cursor: "pointer",
                                        background: isActive ? "var(--rust-soft)" : "transparent",
                                        borderLeft: isActive ? "3px solid var(--rust)" : "3px solid transparent",
                                        transition: "background 0.15s",
                                    }}
                                >
                                    <div style={{ position: "relative", flexShrink: 0 }}>
                                        <img src={avatar} alt={name} style={{ width: 44, height: 44, borderRadius: isDM ? "50%" : 10, objectFit: "cover", background: "var(--cream-2)" }} />
                                        {!isDM && (
                                            <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 10, background: "var(--forest)", color: "var(--ivory)", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>
                                                #
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                                            <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{fmt(item.lastAt)}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {item.lastMessage || (isDM ? "Start chatting" : "No messages yet")}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Chat Area ── */}
                {!active ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--muted)" }}>
                        <div style={{ color: "var(--rust)" }}><Icon name="message" size={44} stroke={1.2} /></div>
                        <p style={{ fontSize: 16 }}>Select a conversation to start chatting</p>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        {/* Chat header */}
                        <div style={{
                            padding: "16px 24px",
                            borderBottom: "1px solid var(--line)",
                            background: "var(--card)",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                        }}>
                            <img src={active.avatar} alt={active.name} style={{ width: 40, height: 40, borderRadius: active.type === "DM" ? "50%" : 10, objectFit: "cover" }} />
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{active.name}</p>
                                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                                    {active.type === "DM" ? `@${active.username}` : "Group Chat"}
                                </p>
                            </div>
                            {active.type === "DM" && (
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => navigate(`/users/${active.username}`)}
                                    style={{ marginLeft: "auto", fontSize: 13, padding: "7px 16px" }}
                                >
                                    View Profile
                                </button>
                            )}
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                            {msgLoading && [...Array(5)].map((_, i) => (
                                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end" }}>
                                    {i % 2 === 0 && <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />}
                                    <div className="skeleton" style={{ height: 36, width: `${120 + i * 30}px`, borderRadius: 12 }} />
                                </div>
                            ))}
                            {!msgLoading && messages.length === 0 && (
                                <div style={{ textAlign: "center", color: "var(--muted)", marginTop: 40, fontSize: 14 }}>
                                    No messages yet. Say hello!
                                </div>
                            )}
                            {!msgLoading && messages.map((msg, i) => {
                                const isMe = msg.sender._id?.toString() === me?._id?.toString() || msg.sender === me?._id?.toString();
                                const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender._id?.toString() !== msg.sender._id?.toString());
                                return (
                                    <div key={msg._id || i} style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                        {!isMe && (
                                            <img
                                                src={msg.sender.avatar}
                                                alt=""
                                                onClick={() => msg.sender.username && navigate(`/users/${msg.sender.username}`)}
                                                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, opacity: showAvatar ? 1 : 0, cursor: msg.sender.username ? "pointer" : "default" }}
                                            />
                                        )}
                                        <div style={{ maxWidth: "60%" }}>
                                            {!isMe && showAvatar && (
                                                <p
                                                    onClick={() => msg.sender.username && navigate(`/users/${msg.sender.username}`)}
                                                    style={{ margin: "0 0 3px 4px", fontSize: 11, color: "var(--muted)", fontWeight: 600, cursor: msg.sender.username ? "pointer" : "default" }}
                                                >
                                                    {msg.sender.fullName}
                                                </p>
                                            )}
                                            <div style={{
                                                background: isMe ? "var(--rust)" : "var(--cream-2)",
                                                color: isMe ? "var(--forest-deep)" : "var(--ink)",
                                                fontWeight: isMe ? 500 : 400,
                                                padding: "10px 14px",
                                                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                                fontSize: 14,
                                                lineHeight: 1.5,
                                                wordBreak: "break-word",
                                            }}>
                                                {msg.content}
                                            </div>
                                            <p style={{ margin: "3px 4px 0", fontSize: 10, color: "var(--muted)", textAlign: isMe ? "right" : "left" }}>
                                                {fmtTime(msg.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} style={{
                            padding: "14px 24px",
                            borderTop: "1px solid var(--line)",
                            background: "var(--card)",
                            display: "flex",
                            gap: 10,
                        }}>
                            <input
                                ref={inputRef}
                                className="field"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Type a message…"
                                disabled={sending}
                                style={{ flex: 1, padding: "11px 16px", fontSize: 14 }}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!text.trim() || sending}
                                className="btn btn-primary"
                                style={{ padding: "0 22px", fontSize: 14, flexShrink: 0 }}
                            >
                                Send
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessagesPage;
