import { useState, useCallback } from "react";
import { View, Text, FlatList, Image, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import api, { apiErrorMessage } from "../api/client";
import { colors, radius, font, spacing } from "../theme";

// Icon + tint per notification type
const TYPE_ICON = {
    POST_LIKE: { icon: "heart", color: colors.rust },
    POST_COMMENT: { icon: "chatbubble", color: colors.rust },
    JOIN_REQUEST: { icon: "person-add", color: colors.rust },
    JOIN_APPROVED: { icon: "checkmark-circle", color: colors.rust },
    JOIN_REJECTED: { icon: "close-circle", color: colors.muted },
    CLUB_INVITE: { icon: "mail", color: colors.rust },
    CONNECTION_REQUEST: { icon: "person-add", color: colors.rust },
    CONNECTION_ACCEPTED: { icon: "people", color: colors.rust },
    EVENT_INVITE: { icon: "calendar", color: colors.rust },
    REMINDER: { icon: "alarm", color: colors.rust },
    ANNOUNCEMENT: { icon: "megaphone", color: colors.rust },
    CLUB_UPDATE: { icon: "information-circle", color: colors.rust },
};

function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const res = await api.get("/notifications", { params: { limit: 30 } });
            setItems(res.data.data || []);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load notifications."));
        } finally {
            isRefresh ? setRefreshing(false) : setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const markAllRead = async () => {
        // optimistic
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            await api.patch("/notifications/mark-all-read");
        } catch {
            load(); // revert to server state on failure
        }
    };

    const markOneRead = async (n) => {
        if (n.isRead) return;
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        try {
            await api.patch(`/notifications/${n._id}/read`);
        } catch {
            /* non-critical */
        }
    };

    const unreadCount = items.filter((n) => !n.isRead).length;

    const renderItem = ({ item }) => {
        const meta = TYPE_ICON[item.type] || { icon: "notifications", color: colors.rust };
        return (
            <Pressable onPress={() => markOneRead(item)} style={[styles.row, !item.isRead && styles.rowUnread]}>
                {item.relatedUser?.avatar ? (
                    <Image source={{ uri: item.relatedUser.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.iconWrap]}>
                        <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                )}
                <View style={styles.body}>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead ? <View style={styles.dot} /> : null}
            </Pressable>
        );
    };

    return (
        <ScreenContainer padded={false}>
            <FlatList
                data={items}
                keyExtractor={(n) => n._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => load(true)}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.kicker}>ACTIVITY</Text>
                            <Text style={styles.heading}>Notifications</Text>
                        </View>
                        {unreadCount > 0 ? (
                            <Pressable onPress={markAllRead}>
                                <Text style={styles.markAll}>Mark all read</Text>
                            </Pressable>
                        ) : null}
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
                    ) : error ? (
                        <Text style={styles.empty}>{error}</Text>
                    ) : (
                        <Text style={styles.empty}>You're all caught up 🎉</Text>
                    )
                }
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.md, marginBottom: spacing.md },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2 },
    heading: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs },
    markAll: { color: colors.rust, fontSize: font.small, fontWeight: "700", paddingBottom: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    rowUnread: { backgroundColor: colors.rustSoft },
    avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    iconWrap: { alignItems: "center", justifyContent: "center" },
    body: { flex: 1 },
    message: { color: colors.inkSoft, fontSize: font.small, lineHeight: 20 },
    time: { color: colors.muted, fontSize: font.tiny, marginTop: 2 },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.rust },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl },
});
