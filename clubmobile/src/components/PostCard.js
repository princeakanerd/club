import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, font, spacing } from "../theme";

const EMOJIS = ["👍", "❤️", "🎉", "😮", "😂", "🔥"];

/* Aggregate reactions[{user, emoji}] into { emoji: count } and find mine. */
function reactionSummary(reactions = [], myId) {
    const counts = {};
    let mine = null;
    for (const r of reactions) {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (String(r.user?._id || r.user) === String(myId)) mine = r.emoji;
    }
    return { counts, mine };
}

/* A club post: image or poll, caption, author, and an engagement bar.
   Callbacks: onToggleLike, onReact(emoji), onVote(index), onOpenComments. */
export default function PostCard({ post, myId, onToggleLike, onReact, onVote, onOpenComments }) {
    const liked = (post.likes || []).some((u) => String(u?._id || u) === String(myId));
    const likeCount = post.likes?.length || 0;
    const { counts, mine } = reactionSummary(post.reactions, myId);
    const hasPoll = !!post.poll?.question;
    const totalVotes = hasPoll ? post.poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0) : 0;
    const myVoteIdx = hasPoll
        ? post.poll.options.findIndex((o) => (o.votes || []).some((v) => String(v?._id || v) === String(myId)))
        : -1;

    return (
        <View style={styles.card}>
            {/* Author */}
            <View style={styles.header}>
                {post.author?.avatar ? <Image source={{ uri: post.author.avatar }} style={styles.avatar} /> : <View style={styles.avatar} />}
                <View>
                    <Text style={styles.authorName}>{post.author?.fullName}</Text>
                    <Text style={styles.authorHandle}>@{post.author?.username}</Text>
                </View>
            </View>

            {/* Image */}
            {post.image ? <Image source={{ uri: post.image }} style={styles.image} /> : null}

            {/* Caption */}
            {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

            {/* Poll */}
            {hasPoll ? (
                <View style={styles.poll}>
                    <Text style={styles.pollQuestion}>{post.poll.question}</Text>
                    {post.poll.options.map((opt, i) => {
                        const votes = opt.votes?.length || 0;
                        const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                        const mineOpt = i === myVoteIdx;
                        return (
                            <Pressable
                                key={opt._id || i}
                                onPress={() => !post.poll.closed && onVote?.(i)}
                                style={styles.pollOption}
                            >
                                {/* filled bar */}
                                <View style={[styles.pollFill, { width: `${pct}%` }, mineOpt && styles.pollFillMine]} />
                                <View style={styles.pollOptionRow}>
                                    <Text style={[styles.pollText, mineOpt && styles.pollTextMine]}>
                                        {mineOpt ? "✓ " : ""}{opt.text}
                                    </Text>
                                    <Text style={styles.pollPct}>{pct}%</Text>
                                </View>
                            </Pressable>
                        );
                    })}
                    <Text style={styles.pollMeta}>
                        {totalVotes} vote{totalVotes === 1 ? "" : "s"}{post.poll.closed ? " · closed" : ""}
                    </Text>
                </View>
            ) : null}

            {/* Reaction chips (only show emojis that have counts) */}
            {Object.keys(counts).length > 0 ? (
                <View style={styles.reactionSummary}>
                    {Object.entries(counts).map(([emoji, n]) => (
                        <View key={emoji} style={styles.reactionChip}>
                            <Text style={styles.reactionChipText}>{emoji} {n}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {/* Engagement bar */}
            <View style={styles.actions}>
                <Pressable onPress={onToggleLike} style={styles.action} hitSlop={8}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? colors.rust : colors.muted} />
                    <Text style={styles.actionText}>{likeCount}</Text>
                </Pressable>
                <Pressable onPress={onOpenComments} style={styles.action} hitSlop={8}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.muted} />
                    <Text style={styles.actionText}>{post.comments?.length || 0}</Text>
                </Pressable>
            </View>

            {/* Emoji react row */}
            <View style={styles.emojiRow}>
                {EMOJIS.map((e) => (
                    <Pressable key={e} onPress={() => onReact?.(e)} style={[styles.emojiBtn, mine === e && styles.emojiBtnActive]}>
                        <Text style={styles.emoji}>{e}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
    avatar: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
    authorName: { color: colors.ink, fontSize: font.small, fontWeight: "700" },
    authorHandle: { color: colors.muted, fontSize: font.tiny },
    image: { width: "100%", height: 260, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, marginBottom: spacing.md },
    caption: { color: colors.inkSoft, fontSize: font.body, lineHeight: 21, marginBottom: spacing.sm },
    poll: { marginTop: spacing.sm, marginBottom: spacing.sm },
    pollQuestion: { color: colors.ink, fontSize: font.body, fontWeight: "700", marginBottom: spacing.sm },
    pollOption: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: radius.md,
        overflow: "hidden",
        marginBottom: spacing.sm,
        justifyContent: "center",
        minHeight: 40,
    },
    pollFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.rustSoft },
    pollFillMine: { backgroundColor: colors.rustSoft },
    pollOptionRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    pollText: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600" },
    pollTextMine: { color: colors.rust },
    pollPct: { color: colors.muted, fontSize: font.small, fontWeight: "700" },
    pollMeta: { color: colors.muted, fontSize: font.tiny, marginTop: 2 },
    reactionSummary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
    reactionChip: { backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    reactionChipText: { color: colors.inkSoft, fontSize: font.tiny },
    actions: { flexDirection: "row", gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    action: { flexDirection: "row", alignItems: "center", gap: 6 },
    actionText: { color: colors.muted, fontSize: font.small },
    emojiRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md },
    emojiBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
    emojiBtnActive: { backgroundColor: colors.rustSoft },
    emoji: { fontSize: 20 },
});
