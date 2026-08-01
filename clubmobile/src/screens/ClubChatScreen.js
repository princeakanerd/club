import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import MessageBubble from "../components/MessageBubble";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { colors, radius, font, spacing } from "../theme";

export default function ClubChatScreen({ route }) {
    const { clubId } = route.params;
    const { user } = useAuth();
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState({}); // userId -> timeoutId marker

    const typingTimeout = useRef(null);

    const loadMessages = useCallback(async () => {
        try {
            const res = await api.get(`/messages/club/${clubId}`, { params: { limit: 50 } });
            setMessages(res.data.data || []);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load the chat. You may need to be a member."));
        } finally {
            setLoading(false);
        }
    }, [clubId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    // Join the club room + wire live events
    useEffect(() => {
        if (!socket) return;
        socket.emit("join_club", clubId);

        const onClubMsg = (msg) => {
            if (String(msg.clubId) !== String(clubId)) return;
            setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
        };
        const onTyping = ({ clubId: cid, userId, isTyping }) => {
            if (String(cid) !== String(clubId) || String(userId) === String(user?._id)) return;
            setTypingUsers((prev) => {
                const next = { ...prev };
                if (isTyping) next[userId] = Date.now();
                else delete next[userId];
                return next;
            });
        };

        socket.on("new_club_message", onClubMsg);
        socket.on("typing", onTyping);
        return () => {
            socket.emit("leave_club", clubId);
            socket.off("new_club_message", onClubMsg);
            socket.off("typing", onTyping);
        };
    }, [socket, clubId, user?._id]);

    const onChangeInput = (text) => {
        setInput(text);
        if (!socket) return;
        socket.emit("typing", { clubId, isTyping: true });
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => socket.emit("typing", { clubId, isTyping: false }), 1500);
    };

    const send = async () => {
        const content = input.trim();
        if (!content) return;
        setInput("");
        setSending(true);
        socket?.emit("typing", { clubId, isTyping: false });
        try {
            const res = await api.post(`/messages/club/${clubId}`, { content });
            // append mine (the broadcast reaches other room members; also guard dupes)
            setMessages((prev) => (prev.some((m) => m._id === res.data.data._id) ? prev : [...prev, res.data.data]));
        } catch (err) {
            setError(apiErrorMessage(err, "Message failed to send."));
            setInput(content);
        } finally {
            setSending(false);
        }
    };

    const isMine = (m) => String(m.sender?._id || m.sender) === String(user?._id);
    const typingCount = Object.keys(typingUsers).length;

    if (loading) {
        return (
            <ScreenContainer>
                <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
                <FlatList
                    data={messages}
                    keyExtractor={(m, i) => m._id || String(i)}
                    renderItem={({ item }) => <MessageBubble message={item} mine={isMine(item)} showSender />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.empty}>{error || "No messages yet. Start the conversation!"}</Text>}
                />

                {typingCount > 0 ? (
                    <Text style={styles.typing}>{typingCount === 1 ? "Someone is typing…" : `${typingCount} people are typing…`}</Text>
                ) : null}

                <View style={styles.composer}>
                    <TextInput
                        value={input}
                        onChangeText={onChangeInput}
                        placeholder="Message the club…"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                        multiline
                    />
                    <Pressable onPress={send} disabled={sending || !input.trim()} style={[styles.send, (sending || !input.trim()) && styles.sendDisabled]}>
                        {sending ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.sendText}>Send</Text>}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { padding: spacing.md, flexGrow: 1 },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg },
    typing: { color: colors.muted, fontSize: font.tiny, fontStyle: "italic", paddingHorizontal: spacing.md, marginBottom: 2 },
    composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    input: {
        flex: 1, maxHeight: 100, backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: font.body,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    send: { backgroundColor: colors.rust, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 40, alignItems: "center", justifyContent: "center" },
    sendDisabled: { opacity: 0.5 },
    sendText: { color: colors.bg, fontWeight: "700", fontSize: font.small },
});
