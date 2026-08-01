import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import MessageBubble from "../components/MessageBubble";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { colors, radius, font, spacing } from "../theme";

export default function DMThreadScreen({ route }) {
    const { partnerId } = route.params;
    const { user } = useAuth();
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);

    const typingTimeout = useRef(null); // clears my "typing" signal
    const clearPartnerTyping = useRef(null); // hides partner's indicator

    // Load history (GET marks partner's messages read + emits dm_read for us)
    const loadThread = useCallback(async () => {
        try {
            const res = await api.get(`/messages/dm/${partnerId}`, { params: { limit: 50 } });
            setMessages(res.data.data || []);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load this chat."));
        } finally {
            setLoading(false);
        }
    }, [partnerId]);

    useEffect(() => {
        loadThread();
    }, [loadThread]);

    // Live socket wiring
    useEffect(() => {
        if (!socket) return;

        const onNewDM = (msg) => {
            // Only messages from THIS partner belong in this thread
            if (String(msg.sender?._id || msg.sender) !== String(partnerId)) return;
            setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
            // Mark read since the thread is open, and tell the partner
            api.patch(`/messages/dm/${partnerId}/read`).catch(() => {});
        };
        const onTyping = ({ from, isTyping }) => {
            if (String(from) !== String(partnerId)) return;
            setPartnerTyping(isTyping);
            if (isTyping) {
                clearTimeout(clearPartnerTyping.current);
                clearPartnerTyping.current = setTimeout(() => setPartnerTyping(false), 4000);
            }
        };

        socket.on("new_dm", onNewDM);
        socket.on("typing", onTyping);
        return () => {
            socket.off("new_dm", onNewDM);
            socket.off("typing", onTyping);
        };
    }, [socket, partnerId]);

    // Emit typing (debounced stop)
    const onChangeInput = (text) => {
        setInput(text);
        if (!socket) return;
        socket.emit("typing", { to: partnerId, isTyping: true });
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => socket.emit("typing", { to: partnerId, isTyping: false }), 1500);
    };

    const send = async () => {
        const content = input.trim();
        if (!content) return;
        setInput("");
        setSending(true);
        socket?.emit("typing", { to: partnerId, isTyping: false });
        try {
            const res = await api.post(`/messages/dm/${partnerId}`, { content });
            // append my own message (socket new_dm goes to the receiver, not me)
            setMessages((prev) => [...prev, res.data.data]);
        } catch (err) {
            setError(apiErrorMessage(err, "Message failed to send."));
            setInput(content); // restore so they can retry
        } finally {
            setSending(false);
        }
    };

    const isMine = (m) => String(m.sender?._id || m.sender) === String(user?._id);

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
                    renderItem={({ item }) => <MessageBubble message={item} mine={isMine(item)} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.empty}>{error || "Say hello 👋"}</Text>}
                />

                {partnerTyping ? <Text style={styles.typing}>typing…</Text> : null}

                <View style={styles.composer}>
                    <TextInput
                        value={input}
                        onChangeText={onChangeInput}
                        placeholder="Message…"
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
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl },
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
