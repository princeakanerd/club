import { useState, useEffect, useCallback } from "react";
import { View, Text, Image, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import PostCard from "../components/PostCard";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, font, spacing } from "../theme";

/* Full post view with its comment thread. The backend has no "get one post"
   endpoint, so we fetch the club's posts and pick this one — fine at MVP
   scale. Interactions (like/react/vote/comment) refetch to stay in sync. */
export default function PostDetailScreen({ route }) {
    const { postId, clubId } = route.params;
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [comment, setComment] = useState("");
    const [sending, setSending] = useState(false);

    const fetchPost = useCallback(async () => {
        try {
            const res = await api.get(`/posts/club/${clubId}`, { params: { limit: 100 } });
            const found = (res.data.data || []).find((p) => p._id === postId);
            if (!found) setError("This post is no longer available.");
            else setPost(found);
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load the post."));
        } finally {
            setLoading(false);
        }
    }, [clubId, postId]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    const act = async (fn, label) => {
        try {
            await fn();
            fetchPost();
        } catch (err) {
            Alert.alert(label, apiErrorMessage(err));
        }
    };

    const addComment = async () => {
        const text = comment.trim();
        if (!text) return;
        setSending(true);
        try {
            await api.post(`/posts/${postId}/comment`, { text });
            setComment("");
            await fetchPost();
        } catch (err) {
            Alert.alert("Couldn't comment", apiErrorMessage(err));
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <ScreenContainer>
                <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
            </ScreenContainer>
        );
    }
    if (error || !post) {
        return (
            <ScreenContainer>
                <Text style={styles.error}>{error || "Post not found."}</Text>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
                <FlatList
                    data={post.comments || []}
                    keyExtractor={(c, i) => c._id || String(i)}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <View>
                            <PostCard
                                post={post}
                                myId={user?._id}
                                onToggleLike={() => act(() => api.patch(`/posts/${postId}/like`), "Couldn't like")}
                                onReact={(emoji) => act(() => api.patch(`/posts/${postId}/react`, { emoji }), "Couldn't react")}
                                onVote={(idx) => act(() => api.patch(`/posts/${postId}/poll/vote`, { optionIndex: idx }), "Couldn't vote")}
                                onOpenComments={() => {}}
                            />
                            <Text style={styles.commentsTitle}>
                                {(post.comments?.length || 0)} comment{(post.comments?.length || 0) === 1 ? "" : "s"}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.comment}>
                            {item.user?.avatar ? <Image source={{ uri: item.user.avatar }} style={styles.commentAvatar} /> : <View style={styles.commentAvatar} />}
                            <View style={styles.commentBody}>
                                <Text style={styles.commentAuthor}>{item.user?.fullName || item.user?.username || "User"}</Text>
                                <Text style={styles.commentText}>{item.text}</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.noComments}>No comments yet. Be the first!</Text>}
                />

                {/* Comment composer */}
                <View style={styles.composer}>
                    <TextInput
                        value={comment}
                        onChangeText={setComment}
                        placeholder="Add a comment…"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                        multiline
                    />
                    <Pressable onPress={addComment} disabled={sending || !comment.trim()} style={[styles.send, (sending || !comment.trim()) && styles.sendDisabled]}>
                        {sending ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.sendText}>Post</Text>}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { padding: spacing.md, paddingBottom: spacing.lg },
    commentsTitle: { color: colors.ink, fontSize: font.h3, fontWeight: "700", marginTop: spacing.sm, marginBottom: spacing.md },
    comment: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    commentAvatar: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    commentBody: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.sm },
    commentAuthor: { color: colors.ink, fontSize: font.small, fontWeight: "700" },
    commentText: { color: colors.inkSoft, fontSize: font.small, marginTop: 2, lineHeight: 19 },
    noComments: { color: colors.muted, fontSize: font.small, textAlign: "center", marginTop: spacing.md },
    composer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.sm,
        padding: spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.line,
        backgroundColor: colors.bg,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        backgroundColor: colors.surfaceRaised,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        color: colors.ink,
        fontSize: font.body,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    send: { backgroundColor: colors.rust, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 40, alignItems: "center", justifyContent: "center" },
    sendDisabled: { opacity: 0.5 },
    sendText: { color: colors.bg, fontWeight: "700", fontSize: font.small },
    error: { color: colors.danger, fontSize: font.body, textAlign: "center", marginTop: spacing.xl },
});
