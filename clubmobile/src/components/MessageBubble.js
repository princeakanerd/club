import { View, Text, Image, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

function timeOf(iso) {
    try {
        return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch {
        return "";
    }
}

/* A chat message bubble. `mine` right-aligns + rust background. In club chats
   pass `showSender` to label who sent it (with their avatar). */
export default function MessageBubble({ message, mine, showSender }) {
    return (
        <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
            {!mine && showSender && message.sender?.avatar ? (
                <Image source={{ uri: message.sender.avatar }} style={styles.avatar} />
            ) : null}
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!mine && showSender ? (
                    <Text style={styles.sender}>{message.sender?.fullName || message.sender?.username}</Text>
                ) : null}
                <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>{timeOf(message.createdAt)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", marginBottom: spacing.sm, alignItems: "flex-end", gap: 6 },
    rowMine: { justifyContent: "flex-end" },
    rowTheirs: { justifyContent: "flex-start" },
    avatar: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    bubble: { maxWidth: "78%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    bubbleMine: { backgroundColor: colors.rust, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
    sender: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", marginBottom: 2 },
    text: { color: colors.inkSoft, fontSize: font.body, lineHeight: 20 },
    textMine: { color: colors.bg },
    time: { color: colors.muted, fontSize: 10, marginTop: 3, alignSelf: "flex-end" },
    timeMine: { color: "rgba(26,10,14,0.6)" },
});
