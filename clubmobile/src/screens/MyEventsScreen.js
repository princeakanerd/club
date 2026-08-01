import { useState, useCallback } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import EventCard from "../components/EventCard";
import api, { apiErrorMessage } from "../api/client";
import { colors, font, spacing } from "../theme";

/* Upcoming events the user RSVP'd GOING/MAYBE to. Read-only cards (RSVP is
   changed from the club page). Each shows which club is hosting. */
export default function MyEventsScreen() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const res = await api.get("/events/my-upcoming");
            setEvents(res.data.data || []);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load your events."));
        } finally {
            isRefresh ? setRefreshing(false) : setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    return (
        <ScreenContainer padded={false}>
            <FlatList
                data={events}
                keyExtractor={(e) => e._id}
                renderItem={({ item }) => (
                    <View>
                        {item.hostedBy?.name ? (
                            <View style={styles.hostRow}>
                                {item.hostedBy.logo ? <Image source={{ uri: item.hostedBy.logo }} style={styles.hostLogo} /> : null}
                                <Text style={styles.hostName}>{item.hostedBy.name}</Text>
                            </View>
                        ) : null}
                        <EventCard event={item} />
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => load(true)}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.kicker}>UPCOMING</Text>
                        <Text style={styles.title}>My events</Text>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
                    ) : error ? (
                        <Text style={styles.empty}>{error}</Text>
                    ) : (
                        <Text style={styles.empty}>No upcoming events.{"\n"}RSVP to events from a club's page.</Text>
                    )
                }
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
    title: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs, marginBottom: spacing.md },
    hostRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    hostLogo: { width: 20, height: 20, borderRadius: 6 },
    hostName: { color: colors.muted, fontSize: font.small, fontWeight: "600" },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl, lineHeight: 22 },
});
