import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

/* Small pill action button for list rows (Connect / Accept / Message …). */
export default function PillButton({ title, onPress, loading, disabled, variant = "primary" }) {
    const primary = variant === "primary";
    const inactive = disabled || loading;
    return (
        <Pressable
            onPress={onPress}
            disabled={inactive}
            style={({ pressed }) => [
                styles.pill,
                primary ? styles.primary : styles.ghost,
                inactive && styles.inactive,
                pressed && !inactive && { opacity: 0.85 },
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={primary ? colors.bg : colors.ink} />
            ) : (
                <Text style={[styles.text, primary ? styles.textPrimary : styles.textGhost]}>{title}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pill: { minWidth: 74, height: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
    primary: { backgroundColor: colors.rust },
    ghost: { borderWidth: 1, borderColor: colors.line, backgroundColor: "transparent" },
    inactive: { opacity: 0.5 },
    text: { fontSize: font.small, fontWeight: "700" },
    textPrimary: { color: colors.bg },
    textGhost: { color: colors.inkSoft },
});
