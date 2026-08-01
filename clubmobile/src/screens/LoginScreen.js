import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import TextField from "../components/TextField";
import Button from "../components/Button";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, font, spacing } from "../theme";

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async () => {
        if (!email.trim() || !password) {
            setError("Enter your email and password.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/users/login", { email: email.trim(), password });
            // Backend returns { user, accessToken, refreshToken } in data
            await login(res.data.data);
            // On success the RootNavigator swaps to the main app automatically.
        } catch (err) {
            setError(apiErrorMessage(err, "Login failed. Check your credentials."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Text style={styles.kicker}>WELCOME BACK</Text>
                    <Text style={styles.title}>Sign in</Text>
                    <Text style={styles.subtitle}>Pick up right where you left off.</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <TextField
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@college.edu"
                        keyboardType="email-address"
                        autoComplete="email"
                    />
                    <TextField
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                    />

                    <Button title="Sign in" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New here? </Text>
                        <Pressable onPress={() => navigation.navigate("Register")}>
                            <Text style={styles.link}>Create an account</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.xl },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2 },
    title: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs },
    subtitle: { color: colors.muted, fontSize: font.body, marginTop: spacing.xs, marginBottom: spacing.lg },
    error: { color: colors.danger, fontSize: font.small, marginBottom: spacing.md },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
    footerText: { color: colors.muted, fontSize: font.small },
    link: { color: colors.rust, fontSize: font.small, fontWeight: "700" },
});
