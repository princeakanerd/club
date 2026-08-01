import { Pressable, View, Text, Image, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

/* A single club row in the Explore / My Clubs lists. */
export default function ClubCard({ club, onPress }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            {club.logo ? (
                <Image source={{ uri: club.logo }} style={styles.logo} />
            ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                    <Text style={styles.logoLetter}>{club.name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
            )}
            <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>{club.name}</Text>
                <Text style={styles.desc} numberOfLines={2}>{club.description}</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.category}>{cap(club.category)}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.members}>
                        {club.memberCount ?? 0} {club.memberCount === 1 ? "member" : "members"}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    pressed: { opacity: 0.8 },
    logo: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
    logoFallback: { alignItems: "center", justifyContent: "center" },
    logoLetter: { color: colors.rust, fontSize: font.h2, fontWeight: "800" },
    body: { flex: 1, justifyContent: "center" },
    name: { color: colors.ink, fontSize: font.h3, fontWeight: "700" },
    desc: { color: colors.muted, fontSize: font.small, marginTop: 2, lineHeight: 18 },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: 6 },
    category: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 0.5 },
    dot: { color: colors.muted, fontSize: font.tiny },
    members: { color: colors.inkSoft, fontSize: font.tiny },
});
