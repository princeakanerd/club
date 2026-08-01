import { useState, useEffect, useCallback } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator, StyleSheet, Alert, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import EventCard from "../components/EventCard";
import PostCard from "../components/PostCard";
import api, { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, font, spacing } from "../theme";

const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

export default function ClubDetailScreen({ route, navigation }) {
    const { clubId } = route.params;
    const { user, refreshUser } = useAuth();
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [acting, setActing] = useState(false); // join/leave in flight

    const [events, setEvents] = useState([]);
    const [rsvpBusy, setRsvpBusy] = useState(null); // eventId currently RSVP-ing
    const [posts, setPosts] = useState([]);

    const isMember = (user?.joinedClubs || []).some((m) => String(m.club) === String(clubId));
    const myRole = (user?.joinedClubs || []).find((m) => String(m.club) === String(clubId))?.role;
    const isLead = myRole === "LEAD";
    const canPost = myRole === "LEAD" || myRole === "EXECUTIVE"; // may create posts

    const fetchClub = useCallback(async () => {
        try {
            const res = await api.get(`/clubs/${clubId}`);
            setClub(res.data.data);
            setError("");
        } catch (err) {
            setError(apiErrorMessage(err, "Couldn't load this club."));
        } finally {
            setLoading(false);
        }
    }, [clubId]);

    const fetchEvents = useCallback(async () => {
        try {
            const res = await api.get(`/events/club/${clubId}`);
            // upcoming first; backend already sorts ascending by date
            setEvents(res.data.data || []);
        } catch {
            /* events are non-critical; ignore load errors */
        }
    }, [clubId]);

    const fetchPosts = useCallback(async () => {
        try {
            const res = await api.get(`/posts/club/${clubId}`, { params: { limit: 10 } });
            setPosts(res.data.data || []);
        } catch {
            /* posts non-critical; ignore */
        }
    }, [clubId]);

    useEffect(() => {
        fetchClub();
    }, [fetchClub]);

    // Refetch events + posts whenever the screen regains focus (e.g. returning
    // from the Create Post/Event screens) so new content shows immediately.
    useFocusEffect(
        useCallback(() => {
            fetchEvents();
            fetchPosts();
        }, [fetchEvents, fetchPosts])
    );

    // ── Post interactions (optimistic refetch after each) ──
    const onToggleLike = async (postId) => {
        try {
            await api.patch(`/posts/${postId}/like`);
            fetchPosts();
        } catch (err) {
            Alert.alert("Couldn't like", apiErrorMessage(err));
        }
    };
    const onReact = async (postId, emoji) => {
        try {
            await api.patch(`/posts/${postId}/react`, { emoji });
            fetchPosts();
        } catch (err) {
            Alert.alert("Couldn't react", apiErrorMessage(err));
        }
    };
    const onVote = async (postId, optionIndex) => {
        try {
            await api.patch(`/posts/${postId}/poll/vote`, { optionIndex });
            fetchPosts();
        } catch (err) {
            Alert.alert("Couldn't vote", apiErrorMessage(err));
        }
    };

    // My current RSVP status for an event (rsvp[].user is populated on this endpoint)
    const myRsvpFor = (event) =>
        event.rsvp?.find((r) => String(r.user?._id || r.user) === String(user?._id))?.status;

    const onRsvp = async (eventId, status) => {
        setRsvpBusy(eventId);
        try {
            await api.post(`/events/${eventId}/rsvp`, { status });
            await fetchEvents(); // refresh counts + my status
        } catch (err) {
            Alert.alert("RSVP failed", apiErrorMessage(err));
        } finally {
            setRsvpBusy(null);
        }
    };

    const onJoin = async () => {
        setActing(true);
        try {
            await api.post(`/clubs/${clubId}/join`);
            await Promise.all([refreshUser(), fetchClub()]); // update button + member count
        } catch (err) {
            Alert.alert("Couldn't join", apiErrorMessage(err));
        } finally {
            setActing(false);
        }
    };

    const onLeave = async () => {
        if (isLead) {
            Alert.alert("You're the lead", "As the club lead you can't leave — transfer ownership or delete the club from the web app.");
            return;
        }
        setActing(true);
        try {
            await api.post(`/clubs/${clubId}/leave`);
            await Promise.all([refreshUser(), fetchClub()]);
        } catch (err) {
            Alert.alert("Couldn't leave", apiErrorMessage(err));
        } finally {
            setActing(false);
        }
    };

    if (loading) {
        return (
            <ScreenContainer>
                <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
            </ScreenContainer>
        );
    }

    if (error || !club) {
        return (
            <ScreenContainer>
                <Text style={styles.error}>{error || "Club not found."}</Text>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Cover / logo header */}
                {club.coverImage ? <Image source={{ uri: club.coverImage }} style={styles.cover} /> : <View style={styles.coverFallback} />}

                <View style={styles.body}>
                    <View style={styles.headRow}>
                        {club.logo ? (
                            <Image source={{ uri: club.logo }} style={styles.logo} />
                        ) : (
                            <View style={[styles.logo, styles.logoFallback]}>
                                <Text style={styles.logoLetter}>{club.name?.[0]?.toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.category}>{cap(club.category)}</Text>
                            <Text style={styles.name}>{club.name}</Text>
                            <Text style={styles.members}>
                                {club.memberCount ?? 0} {club.memberCount === 1 ? "member" : "members"}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.description}>{club.description}</Text>

                    {club.createdBy?.fullName ? (
                        <Text style={styles.lead}>Led by {club.createdBy.fullName} (@{club.createdBy.username})</Text>
                    ) : null}

                    {/* Join / Leave action */}
                    <View style={{ marginTop: spacing.lg }}>
                        {isMember ? (
                            <Button
                                title={isLead ? "You lead this club" : "Leave club"}
                                variant="ghost"
                                onPress={onLeave}
                                loading={acting}
                                disabled={isLead}
                            />
                        ) : club.isAcceptingMembers ? (
                            <Button title="Join club" onPress={onJoin} loading={acting} />
                        ) : (
                            <Button title="Not accepting members" variant="ghost" disabled />
                        )}
                    </View>

                    {/* Group chat (members only) */}
                    {isMember ? (
                        <Button
                            title="💬  Open group chat"
                            variant="ghost"
                            style={{ marginTop: spacing.sm }}
                            onPress={() =>
                                navigation.navigate("Messages", { screen: "ClubChat", params: { clubId, name: club.name } })
                            }
                        />
                    ) : null}

                    {/* Events */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Events</Text>
                        {isLead ? (
                            <Pressable onPress={() => navigation.navigate("CreateEvent", { clubId })}>
                                <Text style={styles.newLink}>+ New</Text>
                            </Pressable>
                        ) : null}
                    </View>
                    {events.length === 0 ? (
                        <Text style={styles.noEvents}>No upcoming events.</Text>
                    ) : (
                        events.map((ev) => (
                            <EventCard
                                key={ev._id}
                                event={ev}
                                myStatus={myRsvpFor(ev)}
                                onRsvp={(status) => onRsvp(ev._id, status)}
                                rsvpLoading={rsvpBusy === ev._id}
                            />
                        ))
                    )}

                    {/* Posts */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Posts</Text>
                        {canPost ? (
                            <Pressable onPress={() => navigation.navigate("CreatePost", { clubId })}>
                                <Text style={styles.newLink}>+ New</Text>
                            </Pressable>
                        ) : null}
                    </View>
                    {posts.length === 0 ? (
                        <Text style={styles.noEvents}>No posts yet.</Text>
                    ) : (
                        posts.map((post) => (
                            <PostCard
                                key={post._id}
                                post={post}
                                myId={user?._id}
                                onToggleLike={() => onToggleLike(post._id)}
                                onReact={(emoji) => onReact(post._id, emoji)}
                                onVote={(idx) => onVote(post._id, idx)}
                                onOpenComments={() =>
                                    navigation.navigate("PostDetail", { postId: post._id, clubId })
                                }
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: { paddingBottom: spacing.xl },
    cover: { width: "100%", height: 140, backgroundColor: colors.surfaceRaised },
    coverFallback: { width: "100%", height: 100, backgroundColor: colors.forest, opacity: 0.4 },
    body: { paddingHorizontal: spacing.md },
    headRow: { flexDirection: "row", gap: spacing.md, marginTop: -28, alignItems: "flex-end" },
    logo: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 2, borderColor: colors.bg },
    logoFallback: { alignItems: "center", justifyContent: "center" },
    logoLetter: { color: colors.rust, fontSize: font.h1, fontWeight: "800" },
    category: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 1 },
    name: { color: colors.ink, fontSize: font.h2, fontWeight: "700", marginTop: 2 },
    members: { color: colors.inkSoft, fontSize: font.small, marginTop: 2 },
    description: { color: colors.inkSoft, fontSize: font.body, lineHeight: 22, marginTop: spacing.lg },
    lead: { color: colors.muted, fontSize: font.small, marginTop: spacing.md },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl, marginBottom: spacing.md },
    sectionTitle: { color: colors.ink, fontSize: font.h3, fontWeight: "700" },
    newLink: { color: colors.rust, fontSize: font.small, fontWeight: "700" },
    noEvents: { color: colors.muted, fontSize: font.small, marginBottom: spacing.md },
    error: { color: colors.danger, fontSize: font.body, textAlign: "center", marginTop: spacing.xl },
});
