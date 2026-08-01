import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

/* Primary (rust) and ghost button variants, with a loading spinner. */
export default function Button({ title, onPress, loading, disabled, variant = "primary", style }) {
    const isPrimary = variant === "primary";
    const inactive = disabled || loading;
    return (
        <Pressable
            onPress={onPress}
            disabled={inactive}
            style={({ pressed }) => [
                styles.base,
                isPrimary ? styles.primary : styles.ghost,
                inactive && styles.inactive,
                pressed && !inactive && styles.pressed,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? colors.bg : colors.ink} />
            ) : (
                <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>{title}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        height: 50,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
    },
    primary: { backgroundColor: colors.rust },
    ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
    inactive: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    label: { fontSize: font.body, fontWeight: "700" },
    labelPrimary: { color: colors.bg },
    labelGhost: { color: colors.ink },
});
