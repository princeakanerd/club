import { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Alert, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import TextField from "../components/TextField";
import Button from "../components/Button";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, font, spacing } from "../theme";

export default function ProfileScreen({ navigation }) {
    const { user, refreshUser, logout } = useAuth();
    const [bio, setBio] = useState(user?.bio || "");
    const [interests, setInterests] = useState((user?.interests || []).join(", "));
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [flash, setFlash] = useState(null); // { type, msg }

    const showFlash = (type, msg) => {
        setFlash({ type, msg });
        setTimeout(() => setFlash(null), 2500);
    };

    const onSave = async () => {
        setSaving(true);
        try {
            await api.patch("/users/profile", {
                bio,
                // backend accepts a comma-separated string or array
                interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
            });
            await refreshUser();
            showFlash("ok", "Profile updated.");
        } catch (err) {
            showFlash("err", apiErrorMessage(err, "Couldn't save."));
        } finally {
            setSaving(false);
        }
    };

    const onChangeAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            showFlash("err", "Photo permission is needed.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setAvatarUploading(true);
        try {
            const fd = new FormData();
            fd.append("avatar", {
                uri: asset.uri,
                name: asset.fileName || `avatar_${Date.now()}.jpg`,
                type: asset.mimeType || "image/jpeg",
            });
            await api.patch("/users/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
            await refreshUser();
            showFlash("ok", "Avatar updated.");
        } catch (err) {
            showFlash("err", apiErrorMessage(err, "Avatar upload failed."));
        } finally {
            setAvatarUploading(false);
        }
    };

    const confirmLogout = () => {
        Alert.alert("Log out?", "You'll need to sign in again.", [
            { text: "Cancel", style: "cancel" },
            { text: "Log out", style: "destructive", onPress: logout },
        ]);
    };

    return (
        <ScreenContainer padded={false}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.kicker}>ACCOUNT</Text>
                        <Text style={styles.title}>Profile</Text>
                    </View>
                    <Pressable onPress={() => navigation.navigate("Notifications")} hitSlop={10} style={styles.bell}>
                        <Ionicons name="notifications-outline" size={24} color={colors.ink} />
                    </Pressable>
                </View>

                {/* Avatar */}
                <View style={styles.avatarWrap}>
                    <Pressable onPress={onChangeAvatar} style={styles.avatarPress}>
                        {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatar} /> : <View style={styles.avatar} />}
                        {avatarUploading && (
                            <View style={styles.avatarOverlay}>
                                <ActivityIndicator color={colors.ivory} />
                            </View>
                        )}
                    </Pressable>
                    <Text style={styles.name}>{user?.fullName}</Text>
                    <Text style={styles.handle}>@{user?.username}</Text>
                    <Pressable onPress={onChangeAvatar}>
                        <Text style={styles.changePhoto}>Change photo</Text>
                    </Pressable>
                </View>

                {flash ? (
                    <Text style={[styles.flash, flash.type === "ok" ? styles.flashOk : styles.flashErr]}>{flash.msg}</Text>
                ) : null}

                {/* Editable fields */}
                <TextField
                    label="Bio"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="A short line about you"
                    multiline
                    maxLength={250}
                    style={{ marginTop: spacing.md }}
                    autoCapitalize="sentences"
                />
                <TextField
                    label="Interests (comma-separated)"
                    value={interests}
                    onChangeText={setInterests}
                    placeholder="Coding, Music, Debate"
                    autoCapitalize="words"
                />

                <Button title="Save changes" onPress={onSave} loading={saving} />

                {/* Read-only account info */}
                <View style={styles.infoBox}>
                    <Row label="Email" value={user?.email} />
                    <Row label="Roll number" value={user?.rollNumber} />
                    <Row label="Batch year" value={String(user?.batchYear ?? "")} />
                    <Row label="Email verified" value={user?.isEmailVerified ? "Yes" : "No"} />
                </View>

                <Button title="Log out" variant="ghost" onPress={confirmLogout} style={{ marginTop: spacing.lg }} />
            </ScrollView>
        </ScreenContainer>
    );
}

function Row({ label, value }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value || "—"}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    bell: { marginTop: spacing.md, padding: spacing.xs },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
    title: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs },
    avatarWrap: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.md },
    avatarPress: { width: 96, height: 96, borderRadius: radius.pill, overflow: "hidden", backgroundColor: colors.surfaceRaised },
    avatar: { width: 96, height: 96, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    avatarOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
    name: { color: colors.ink, fontSize: font.h3, fontWeight: "700", marginTop: spacing.sm },
    handle: { color: colors.muted, fontSize: font.small },
    changePhoto: { color: colors.rust, fontSize: font.small, fontWeight: "700", marginTop: spacing.xs },
    flash: { fontSize: font.small, textAlign: "center", marginBottom: spacing.sm },
    flashOk: { color: colors.rust },
    flashErr: { color: colors.danger },
    infoBox: {
        marginTop: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
    },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    rowLabel: { color: colors.muted, fontSize: font.small },
    rowValue: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600" },
});
