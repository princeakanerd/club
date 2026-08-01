import { useState } from "react";
import { View, Text, Image, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import { pickImageFile } from "../utils/pickImage";
import api, { apiErrorMessage } from "../api/client";
import { colors, radius, font, spacing } from "../theme";

/* Create a club post: either a photo post or a poll. Photo posts submit as
   multipart; poll posts submit as JSON (matching the backend's dual support). */
export default function CreatePostScreen({ route, navigation }) {
    const { clubId } = route.params;
    const [mode, setMode] = useState("photo"); // "photo" | "poll"
    const [caption, setCaption] = useState("");
    const [image, setImage] = useState(null);
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const choosePhoto = async () => {
        const file = await pickImageFile();
        if (file?.error) return setError(file.error);
        if (file) setImage(file);
    };

    const setOption = (i, val) => setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
    const addOption = () => options.length < 6 && setOptions((prev) => [...prev, ""]);
    const removeOption = (i) => options.length > 2 && setOptions((prev) => prev.filter((_, idx) => idx !== i));

    const submit = async () => {
        setError("");
        if (mode === "photo" && !image) return setError("Pick a photo, or switch to a poll.");
        const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
        if (mode === "poll" && (!question.trim() || cleanOpts.length < 2))
            return setError("A poll needs a question and at least 2 options.");

        setLoading(true);
        try {
            if (mode === "photo") {
                const fd = new FormData();
                fd.append("clubId", clubId);
                fd.append("caption", caption);
                fd.append("image", image);
                await api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                await api.post("/posts", {
                    clubId,
                    caption,
                    poll: { question: question.trim(), options: cleanOpts },
                });
            }
            navigation.goBack();
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't create the post."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer padded={false}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Mode toggle */}
                    <View style={styles.toggle}>
                        {["photo", "poll"].map((m) => (
                            <Pressable key={m} onPress={() => setMode(m)} style={[styles.toggleBtn, mode === m && styles.toggleActive]}>
                                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>{m === "photo" ? "Photo" : "Poll"}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {mode === "photo" ? (
                        <Pressable onPress={choosePhoto} style={styles.imagePick}>
                            {image ? <Image source={{ uri: image.uri }} style={styles.imagePreview} /> : <Text style={styles.imagePickText}>+ Choose photo</Text>}
                        </Pressable>
                    ) : (
                        <View>
                            <Text style={styles.label}>Question</Text>
                            <TextInput value={question} onChangeText={setQuestion} placeholder="What do you want to ask?" placeholderTextColor={colors.muted} style={styles.input} />
                            <Text style={styles.label}>Options</Text>
                            {options.map((opt, i) => (
                                <View key={i} style={styles.optionRow}>
                                    <TextInput value={opt} onChangeText={(v) => setOption(i, v)} placeholder={`Option ${i + 1}`} placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                                    {options.length > 2 ? (
                                        <Pressable onPress={() => removeOption(i)} style={styles.removeOpt}><Text style={styles.removeOptText}>✕</Text></Pressable>
                                    ) : null}
                                </View>
                            ))}
                            {options.length < 6 ? (
                                <Pressable onPress={addOption}><Text style={styles.addOpt}>+ Add option</Text></Pressable>
                            ) : null}
                        </View>
                    )}

                    <Text style={styles.label}>Caption {mode === "poll" ? "(optional)" : ""}</Text>
                    <TextInput value={caption} onChangeText={setCaption} placeholder="Say something…" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />

                    <Button title="Post" onPress={submit} loading={loading} style={{ marginTop: spacing.md }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    toggle: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: "center" },
    toggleActive: { backgroundColor: colors.rust, borderColor: colors.rust },
    toggleText: { color: colors.inkSoft, fontSize: font.small, fontWeight: "700" },
    toggleTextActive: { color: colors.bg },
    error: { color: colors.danger, fontSize: font.small, marginBottom: spacing.sm },
    imagePick: { height: 200, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: spacing.md },
    imagePickText: { color: colors.muted, fontSize: font.body, fontWeight: "600" },
    imagePreview: { width: "100%", height: "100%" },
    label: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600", marginBottom: spacing.xs, marginTop: spacing.sm },
    input: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, color: colors.ink, fontSize: font.body, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
    multiline: { minHeight: 70, textAlignVertical: "top" },
    optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    removeOpt: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
    removeOptText: { color: colors.muted, fontSize: font.body },
    addOpt: { color: colors.rust, fontSize: font.small, fontWeight: "700", marginBottom: spacing.sm },
});
