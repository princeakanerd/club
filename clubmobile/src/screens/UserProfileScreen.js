import { useState, useEffect, useCallback } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, font, spacing } from "../theme";

/* Derive my relationship to this profile from its connections[] array.
   Returns: "SELF" | "CONNECTED" | "PENDING_SENT" | "PENDING_RECEIVED" | "NONE" */
function relationship(profile, myId) {
    if (!profile || !myId) return "NONE";
    if (String(profile._id) === String(myId)) return "SELF";
    const entry = (profile.connections || []).find((c) => String(c.user) === String(myId));
    if (!entry) return "NONE";
    if (entry.status === "ACCEPTED") return "CONNECTED";
    // pending: initiatedBy me => I sent it; else they sent it (I can accept)
    return String(entry.initiatedBy) === String(myId) ? "PENDING_SENT" : "PENDING_RECEIVED";
}

export default function UserProfileScreen({ route, navigation }) {
    const { username } = route.params;
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [acting, setActing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/users/${username}/profile`);
            setProfile(res.data.data);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load this profile."));
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => { load(); }, [load]);

    const status = relationship(profile, user?._id);

    const act = async (fn, failMsg) => {
        setActing(true);
        try {
            await fn();
            await load();
        } catch (err) {
            Alert.alert("Error", apiErrorMessage(err, failMsg));
        } finally {
            setActing(false);
        }
    };

    const connect = () => act(() => api.post(`/users/${profile._id}/connect`), "Couldn't send request");
    const accept = () => act(() => api.post(`/users/${profile._id}/connect/accept`), "Couldn't accept");
    const remove = () => act(() => api.delete(`/users/${profile._id}/connect`), "Couldn't update");
    const message = () => navigation.navigate("Messages", { screen: "DMThread", params: { partnerId: profile._id, name: profile.fullName } });

    if (loading) {
        return <ScreenContainer><ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} /></ScreenContainer>;
    }
    if (error || !profile) {
        return <ScreenContainer><Text style={styles.error}>{error || "Profile not found."}</Text></ScreenContainer>;
    }

    return (
        <ScreenContainer>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    {profile.avatar ? <Image source={{ uri: profile.avatar }} style={styles.avatar} /> : <View style={styles.avatar} />}
                    <Text style={styles.name}>{profile.fullName}</Text>
                    <Text style={styles.handle}>@{profile.username}</Text>
                    {profile.batchYear ? <Text style={styles.meta}>Batch {profile.batchYear}</Text> : null}
                </View>

                {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

                {profile.interests?.length ? (
                    <View style={styles.chips}>
                        {profile.interests.map((it) => (
                            <View key={it} style={styles.chip}><Text style={styles.chipText}>{it}</Text></View>
                        ))}
                    </View>
                ) : null}

                {/* Relationship action */}
                <View style={styles.actions}>
                    {status === "SELF" ? (
                        <Button title="Edit your profile" variant="ghost" onPress={() => navigation.navigate("Profile")} />
                    ) : status === "CONNECTED" ? (
                        <>
                            <Button title="Message" onPress={message} loading={acting} />
                            <Button title="Remove connection" variant="ghost" onPress={remove} loading={acting} style={{ marginTop: spacing.sm }} />
                        </>
                    ) : status === "PENDING_SENT" ? (
                        <Button title="Request sent" variant="ghost" disabled />
                    ) : status === "PENDING_RECEIVED" ? (
                        <>
                            <Button title="Accept request" onPress={accept} loading={acting} />
                            <Button title="Decline" variant="ghost" onPress={remove} loading={acting} style={{ marginTop: spacing.sm }} />
                        </>
                    ) : (
                        <Button title="Connect" onPress={connect} loading={acting} />
                    )}
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: { paddingVertical: spacing.lg, alignItems: "stretch" },
    header: { alignItems: "center" },
    avatar: { width: 96, height: 96, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    name: { color: colors.ink, fontSize: font.h2, fontWeight: "700", marginTop: spacing.md },
    handle: { color: colors.muted, fontSize: font.small },
    meta: { color: colors.muted, fontSize: font.small, marginTop: 2 },
    bio: { color: colors.inkSoft, fontSize: font.body, lineHeight: 22, textAlign: "center", marginTop: spacing.lg },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md },
    chip: { backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    chipText: { color: colors.inkSoft, fontSize: font.small },
    actions: { marginTop: spacing.xl },
    error: { color: colors.danger, fontSize: font.body, textAlign: "center", marginTop: spacing.xl },
});
