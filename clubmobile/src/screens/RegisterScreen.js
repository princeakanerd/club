import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import TextField from "../components/TextField";
import Button from "../components/Button";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, font, spacing } from "../theme";

export default function RegisterScreen({ navigation }) {
    const { login } = useAuth();
    const [form, setForm] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
        batchYear: String(new Date().getFullYear()),
        rollNumber: "",
    });
    const [avatar, setAvatar] = useState(null); // { uri, name, type }
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

    const pickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            setError("Photo permission is needed to choose an avatar.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"], // SDK 57: array of strings, not MediaTypeOptions
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            const name = asset.fileName || `avatar_${Date.now()}.jpg`;
            setAvatar({ uri: asset.uri, name, type: asset.mimeType || "image/jpeg" });
        }
    };

    const onSubmit = async () => {
        const { fullName, username, email, password, batchYear, rollNumber } = form;
        if (!fullName || !username || !email || !password || !batchYear || !rollNumber) {
            setError("Please fill in all fields.");
            return;
        }
        if (!avatar) {
            setError("An avatar image is required.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            // Multipart — the backend's /register expects a file upload.
            const fd = new FormData();
            fd.append("fullName", fullName);
            fd.append("username", username);
            fd.append("email", email);
            fd.append("password", password);
            fd.append("batchYear", batchYear);
            fd.append("rollNumber", rollNumber);
            // React Native FormData accepts { uri, name, type } for files.
            fd.append("avatar", { uri: avatar.uri, name: avatar.name, type: avatar.type });

            await api.post("/users/register", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Registration doesn't return tokens, so log in right after.
            const res = await api.post("/users/login", { email: email.trim(), password });
            await login(res.data.data);
        } catch (err) {
            setError(apiErrorMessage(err, "Registration failed."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Text style={styles.kicker}>GET STARTED</Text>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Join your campus communities.</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* Avatar picker */}
                    <Pressable onPress={pickAvatar} style={styles.avatarPick}>
                        {avatar ? (
                            <Image source={{ uri: avatar.uri }} style={styles.avatarImg} />
                        ) : (
                            <Text style={styles.avatarText}>+ Add avatar</Text>
                        )}
                    </Pressable>

                    <TextField label="Full name" value={form.fullName} onChangeText={set("fullName")} placeholder="Prince Gajnani" autoCapitalize="words" />
                    <TextField label="Username" value={form.username} onChangeText={set("username")} placeholder="prince" />
                    <TextField label="Email" value={form.email} onChangeText={set("email")} placeholder="you@college.edu" keyboardType="email-address" />
                    <TextField label="Password" value={form.password} onChangeText={set("password")} placeholder="6+ characters" secureTextEntry />
                    <TextField label="Roll number" value={form.rollNumber} onChangeText={set("rollNumber")} placeholder="21CS045" autoCapitalize="characters" />
                    <TextField label="Batch year" value={form.batchYear} onChangeText={set("batchYear")} placeholder="2025" keyboardType="number-pad" />

                    <Button title="Create account" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Pressable onPress={() => navigation.navigate("Login")}>
                            <Text style={styles.link}>Sign in</Text>
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
    avatarPick: {
        alignSelf: "center",
        width: 96,
        height: 96,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.lg,
        overflow: "hidden",
    },
    avatarImg: { width: "100%", height: "100%" },
    avatarText: { color: colors.muted, fontSize: font.small, fontWeight: "600" },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
    footerText: { color: colors.muted, fontSize: font.small },
    link: { color: colors.rust, fontSize: font.small, fontWeight: "700" },
});
