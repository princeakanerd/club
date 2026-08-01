import { useState, useCallback } from "react";
import { View, Text, FlatList, Image, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import api, { apiErrorMessage } from "../api/client";
import { colors, radius, font, spacing } from "../theme";

/* Conversation list: DMs and club group chats, each with a last-message
   preview and unread badge. Tapping opens the matching thread screen. */
export default function InboxScreen({ navigation }) {
    const [convos, setConvos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const res = await api.get("/messages/inbox");
            setConvos(res.data.data || []);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load messages."));
        } finally {
            isRefresh ? setRefreshing(false) : setLoading(false);
        }
    }, []);

    // Reload when returning to the tab (e.g. after reading a thread)
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const openConvo = (item) => {
        if (item.type === "DM") {
            navigation.navigate("DMThread", {
                partnerId: item.partnerId,
                name: item.partner?.fullName || item.partner?.username,
            });
        } else {
            navigation.navigate("ClubChat", { clubId: item.clubId, name: item.club?.name });
        }
    };

    const renderItem = ({ item }) => {
        const isDM = item.type === "DM";
        const title = isDM ? item.partner?.fullName || item.partner?.username : item.club?.name;
        const avatar = isDM ? item.partner?.avatar : item.club?.logo;
        return (
            <Pressable onPress={() => openConvo(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={[styles.avatar, !isDM && styles.clubAvatar]} />
                ) : (
                    <View style={[styles.avatar, !isDM && styles.clubAvatar, styles.avatarFallback]}>
                        <Text style={styles.avatarLetter}>{title?.[0]?.toUpperCase() || "?"}</Text>
                    </View>
                )}
                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1}>{title || "Conversation"}</Text>
                        {!isDM ? <Text style={styles.tag}>CLUB</Text> : null}
                    </View>
                    <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || "No messages yet"}</Text>
                </View>
                {item.unread > 0 ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
                    </View>
                ) : null}
            </Pressable>
        );
    };

    return (
        <ScreenContainer padded={false}>
            <FlatList
                data={convos}
                keyExtractor={(c) => (c.type === "DM" ? `dm_${c.partnerId}` : `club_${c.clubId}`)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => load(true)}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.kicker}>INBOX</Text>
                        <Text style={styles.heading}>Messages</Text>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
                    ) : error ? (
                        <Text style={styles.empty}>{error}</Text>
                    ) : (
                        <Text style={styles.empty}>No conversations yet.{"\n"}Join a club or connect with someone to start chatting.</Text>
                    )
                }
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
    heading: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs, marginBottom: spacing.md },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    pressed: { opacity: 0.7 },
    avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    clubAvatar: { borderRadius: radius.md },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    avatarLetter: { color: colors.rust, fontSize: font.h3, fontWeight: "800" },
    body: { flex: 1 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    title: { color: colors.ink, fontSize: font.body, fontWeight: "700", flexShrink: 1 },
    tag: { color: colors.rust, fontSize: 9, fontWeight: "800", letterSpacing: 0.5, borderWidth: 1, borderColor: colors.rustSoft, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    preview: { color: colors.muted, fontSize: font.small, marginTop: 2 },
    badge: { backgroundColor: colors.rust, borderRadius: radius.pill, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
    badgeText: { color: colors.bg, fontSize: font.tiny, fontWeight: "800" },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl, lineHeight: 22 },
});
