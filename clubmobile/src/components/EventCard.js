import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

/* Formats an ISO date like "Fri, Aug 8 · 2:22 PM". */
export function formatEventDate(iso) {
    try {
        const d = new Date(iso);
        const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return `${date} · ${time}`;
    } catch {
        return "";
    }
}

const RSVP_OPTIONS = [
    { key: "GOING", label: "Going" },
    { key: "MAYBE", label: "Maybe" },
    { key: "NOT_GOING", label: "Can't go" },
];

/* An event with optional inline RSVP controls. Pass `myStatus` (current RSVP),
   `onRsvp(status)`, and `rsvpLoading` to show the selector; omit them for a
   read-only card (e.g. My Events). */
export default function EventCard({ event, myStatus, onRsvp, rsvpLoading, onPress }) {
    const goingCount = Array.isArray(event.rsvp)
        ? event.rsvp.filter((r) => r.status === "GOING").length
        : undefined;

    const Wrapper = onPress ? Pressable : View;

    return (
        <Wrapper onPress={onPress} style={styles.card}>
            {event.bannerImage ? <Image source={{ uri: event.bannerImage }} style={styles.banner} /> : null}
            <View style={styles.body}>
                <Text style={styles.date}>{formatEventDate(event.eventDate)}</Text>
                <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.venue} numberOfLines={1}>📍 {event.venue}</Text>
                {event.description ? (
                    <Text style={styles.desc} numberOfLines={2}>{event.description}</Text>
                ) : null}

                {goingCount !== undefined ? (
                    <Text style={styles.going}>{goingCount} going</Text>
                ) : null}

                {onRsvp ? (
                    <View style={styles.rsvpRow}>
                        {rsvpLoading ? (
                            <ActivityIndicator color={colors.rust} />
                        ) : (
                            RSVP_OPTIONS.map((opt) => {
                                const active = myStatus === opt.key;
                                return (
                                    <Pressable
                                        key={opt.key}
                                        onPress={() => onRsvp(opt.key)}
                                        style={[styles.rsvpBtn, active && styles.rsvpBtnActive]}
                                    >
                                        <Text style={[styles.rsvpText, active && styles.rsvpTextActive]}>{opt.label}</Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </View>
                ) : null}
            </View>
        </Wrapper>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg,
        overflow: "hidden",
        marginBottom: spacing.md,
    },
    banner: { width: "100%", height: 120, backgroundColor: colors.surfaceRaised },
    body: { padding: spacing.md },
    date: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 0.5 },
    title: { color: colors.ink, fontSize: font.h3, fontWeight: "700", marginTop: 3 },
    venue: { color: colors.inkSoft, fontSize: font.small, marginTop: 4 },
    desc: { color: colors.muted, fontSize: font.small, marginTop: 6, lineHeight: 18 },
    going: { color: colors.muted, fontSize: font.tiny, marginTop: spacing.sm },
    rsvpRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, minHeight: 34, alignItems: "center" },
    rsvpBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
    },
    rsvpBtnActive: { backgroundColor: colors.rust, borderColor: colors.rust },
    rsvpText: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600" },
    rsvpTextActive: { color: colors.bg },
});
