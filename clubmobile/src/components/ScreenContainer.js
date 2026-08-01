import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

/* Standard dark-themed page wrapper: safe-area aware, themed background,
   consistent horizontal padding. */
export default function ScreenContainer({ children, style, padded = true }) {
    return (
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
            <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    inner: { flex: 1 },
    padded: { paddingHorizontal: spacing.md },
});
