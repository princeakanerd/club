import { View, Text, TextInput, StyleSheet } from "react-native";
import { colors, radius, font, spacing } from "../theme";

/* Labeled text input matching the dark theme. */
export default function TextField({ label, style, ...inputProps }) {
    return (
        <View style={[styles.wrap, style]}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="none"
                {...inputProps}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    label: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600", marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        color: colors.ink,
        fontSize: font.body,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
});
