import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import api, { apiErrorMessage } from "../api/client";
import { colors, radius, font, spacing } from "../theme";

const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

const ROLE_STYLE = {
    LEAD: { bg: colors.rust, fg: colors.bg },
    EXECUTIVE: { bg: colors.forest, fg: colors.ivory },
    MEMBER: { bg: colors.surfaceRaised, fg: colors.inkSoft },
};

export default function MyClubsScreen({ navigation }) {
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const res = await api.get("/clubs/my-clubs");
            // filter out any dangling memberships whose club was deleted
            setMemberships((res.data.data || []).filter((m) => m.club));
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load your clubs."));
        } finally {
            isRefresh ? setRefreshing(false) : setLoading(false);
        }
    }, []);

    // Reload each time the tab regains focus (e.g. after joining/leaving elsewhere)
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const renderItem = ({ item }) => {
        const club = item.club;
        const roleStyle = ROLE_STYLE[item.role] || ROLE_STYLE.MEMBER;
        return (
            <Pressable
                onPress={() => navigation.navigate("Explore", { screen: "ClubDetail", params: { clubId: club._id, name: club.name } })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
                {club.logo ? (
                    <Image source={{ uri: club.logo }} style={styles.logo} />
                ) : (
                    <View style={[styles.logo, styles.logoFallback]}>
                        <Text style={styles.logoLetter}>{club.name?.[0]?.toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>{club.name}</Text>
                    <Text style={styles.category}>{cap(club.category)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: roleStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: roleStyle.fg }]}>{cap(item.role)}</Text>
                </View>
            </Pressable>
        );
    };

    return (
        <ScreenContainer padded={false}>
            <FlatList
                data={memberships}
                keyExtractor={(m) => m._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => load(true)}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.kicker}>YOUR CLUBS</Text>
                        <Text style={styles.title}>My clubs</Text>
                        <Pressable onPress={() => navigation.navigate("MyEvents")} style={styles.eventsLink}>
                            <Text style={styles.eventsLinkText}>📅  My upcoming events →</Text>
                        </Pressable>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
                    ) : error ? (
                        <Text style={styles.empty}>{error}</Text>
                    ) : (
                        <Text style={styles.empty}>You haven't joined any clubs yet.{"\n"}Explore and join one!</Text>
                    )
                }
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
    title: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs },
    eventsLink: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
    eventsLinkText: { color: colors.rust, fontSize: font.small, fontWeight: "700" },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    pressed: { opacity: 0.8 },
    logo: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
    logoFallback: { alignItems: "center", justifyContent: "center" },
    logoLetter: { color: colors.rust, fontSize: font.h3, fontWeight: "800" },
    body: { flex: 1 },
    name: { color: colors.ink, fontSize: font.h3, fontWeight: "700" },
    category: { color: colors.muted, fontSize: font.small, marginTop: 2 },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
    badgeText: { fontSize: font.tiny, fontWeight: "700" },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl, lineHeight: 22 },
});
