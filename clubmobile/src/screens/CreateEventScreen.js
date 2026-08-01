import { useState } from "react";
import { View, Text, Image, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import { pickImageFile } from "../utils/pickImage";
import api, { apiErrorMessage } from "../api/client";
import { colors, radius, font, spacing } from "../theme";

/* Create an event for a club (lead only). Banner submitted as multipart.
   Date/time entered as simple fields (YYYY-MM-DD + HH:MM) to avoid a native
   date-picker dependency; combined into an ISO string for the backend. */
export default function CreateEventScreen({ route, navigation }) {
    const { clubId } = route.params;
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [venue, setVenue] = useState("");
    const [date, setDate] = useState(""); // YYYY-MM-DD
    const [time, setTime] = useState(""); // HH:MM (24h)
    const [banner, setBanner] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const chooseBanner = async () => {
        const file = await pickImageFile({ aspect: [16, 9] });
        if (file?.error) return setError(file.error);
        if (file) setBanner(file);
    };

    const submit = async () => {
        setError("");
        if (!title.trim() || !description.trim() || !venue.trim()) return setError("Title, description and venue are required.");
        if (!banner) return setError("A banner image is required.");
        // Validate & build the event date
        const iso = buildISO(date, time);
        if (!iso) return setError("Enter a valid future date (YYYY-MM-DD) and time (HH:MM).");

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("title", title);
            fd.append("description", description);
            fd.append("venue", venue);
            fd.append("eventDate", iso);
            fd.append("hostedBy", clubId);
            fd.append("bannerImage", banner);
            await api.post("/events/create", fd, { headers: { "Content-Type": "multipart/form-data" } });
            navigation.goBack();
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't create the event."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer padded={false}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Pressable onPress={chooseBanner} style={styles.bannerPick}>
                        {banner ? <Image source={{ uri: banner.uri }} style={styles.bannerPreview} /> : <Text style={styles.bannerText}>+ Choose banner image</Text>}
                    </Pressable>

                    <Field label="Title"><TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.muted} style={styles.input} /></Field>
                    <Field label="Description"><TextInput value={description} onChangeText={setDescription} placeholder="What's happening?" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline /></Field>
                    <Field label="Venue"><TextInput value={venue} onChangeText={setVenue} placeholder="Auditorium A / Zoom link" placeholderTextColor={colors.muted} style={styles.input} /></Field>

                    <View style={styles.dateRow}>
                        <Field label="Date (YYYY-MM-DD)" style={{ flex: 1 }}>
                            <TextInput value={date} onChangeText={setDate} placeholder="2026-09-15" placeholderTextColor={colors.muted} style={styles.input} keyboardType="numbers-and-punctuation" />
                        </Field>
                        <Field label="Time (HH:MM)" style={{ width: 110 }}>
                            <TextInput value={time} onChangeText={setTime} placeholder="18:30" placeholderTextColor={colors.muted} style={styles.input} keyboardType="numbers-and-punctuation" />
                        </Field>
                    </View>

                    <Button title="Create event" onPress={submit} loading={loading} style={{ marginTop: spacing.sm }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}

function Field({ label, style, children }) {
    return (
        <View style={[{ marginBottom: spacing.sm }, style]}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </View>
    );
}

/* Combine "YYYY-MM-DD" + "HH:MM" into an ISO string; returns null if invalid
   or in the past. */
function buildISO(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
    const dt = new Date(`${date}T${time.padStart(5, "0")}:00`);
    if (isNaN(dt.getTime()) || dt.getTime() < Date.now()) return null;
    return dt.toISOString();
}

const styles = StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    error: { color: colors.danger, fontSize: font.small, marginBottom: spacing.sm },
    bannerPick: { height: 150, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: spacing.md },
    bannerText: { color: colors.muted, fontSize: font.body, fontWeight: "600" },
    bannerPreview: { width: "100%", height: "100%" },
    label: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600", marginBottom: spacing.xs },
    input: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, color: colors.ink, fontSize: font.body, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    multiline: { minHeight: 80, textAlignVertical: "top" },
    dateRow: { flexDirection: "row", gap: spacing.sm },
});
