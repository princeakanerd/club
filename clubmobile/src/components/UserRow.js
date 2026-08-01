import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

/* A user list row with an avatar, name/handle, and optional action buttons
   passed as children (e.g. Connect / Accept / Message). Tapping the row
   (onPress) typically opens the user's profile. */
export default function UserRow({ user, onPress, children }) {
    return (
        <View style={styles.row}>
            <Pressable onPress={onPress} style={styles.main}>
                {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.fallback]}>
                        <Text style={styles.letter}>{(user.fullName || user.username || "?")[0]?.toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>{user.fullName || user.username}</Text>
                    <Text style={styles.handle} numberOfLines={1}>
                        @{user.username}{user.batchYear ? ` · Batch ${user.batchYear}` : ""}
                    </Text>
                </View>
            </Pressable>
            {children ? <View style={styles.actions}>{children}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: spacing.sm },
    main: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
    avatar: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    fallback: { alignItems: "center", justifyContent: "center" },
    letter: { color: colors.rust, fontSize: font.h3, fontWeight: "800" },
    body: { flex: 1 },
    name: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
    handle: { color: colors.muted, fontSize: font.tiny, marginTop: 2 },
    actions: { flexDirection: "row", gap: spacing.sm },
});
