import { useState, useCallback } from "react";
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import UserRow from "../components/UserRow";
import PillButton from "../components/PillButton";
import api, { apiErrorMessage } from "../api/client";
import { colors, radius, font, spacing } from "../theme";

const TABS = [
    { key: "connections", label: "Connections" },
    { key: "requests", label: "Requests" },
    { key: "find", label: "Find people" },
];

export default function ConnectionsScreen({ navigation }) {
    const [tab, setTab] = useState("connections");
    const [connections, setConnections] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState({}); // userId -> true while an action runs

    // Search
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const loadLists = useCallback(async () => {
        setLoading(true);
        try {
            const [c, r] = await Promise.all([
                api.get("/users/connections"),
                api.get("/users/connection-requests"),
            ]);
            setConnections(c.data.data || []);
            setRequests(r.data.data || []);
        } catch {
            /* ignore; screen shows empty */
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadLists(); }, [loadLists]));

    const setUserBusy = (id, v) => setBusy((p) => ({ ...p, [id]: v }));

    const doSearch = async () => {
        if (query.trim().length < 2) return;
        setSearching(true);
        try {
            const res = await api.get(`/users/search`, { params: { q: query.trim() } });
            setResults(res.data.data || []);
        } catch (err) {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const connect = async (userId) => {
        setUserBusy(userId, true);
        try {
            await api.post(`/users/${userId}/connect`);
            setResults((prev) => prev.filter((u) => u._id !== userId)); // remove from search results
        } catch (err) {
            alert(apiErrorMessage(err));
        } finally {
            setUserBusy(userId, false);
        }
    };

    const accept = async (userId) => {
        setUserBusy(userId, true);
        try {
            await api.post(`/users/${userId}/connect/accept`);
            await loadLists();
        } catch (err) {
            alert(apiErrorMessage(err));
        } finally {
            setUserBusy(userId, false);
        }
    };

    const decline = async (userId) => {
        setUserBusy(userId, true);
        try {
            await api.delete(`/users/${userId}/connect`); // remove pending/accepted
            await loadLists();
        } catch (err) {
            alert(apiErrorMessage(err));
        } finally {
            setUserBusy(userId, false);
        }
    };

    const goProfile = (u) => navigation.navigate("UserProfile", { username: u.username });

    // Choose the data + row renderer per tab
    let data = [];
    let renderRow;
    if (tab === "connections") {
        data = connections;
        renderRow = (u) => (
            <UserRow user={u} onPress={() => goProfile(u)}>
                <PillButton title="Message" variant="ghost" onPress={() => navigation.navigate("Messages", { screen: "DMThread", params: { partnerId: u._id, name: u.fullName } })} />
            </UserRow>
        );
    } else if (tab === "requests") {
        data = requests;
        renderRow = (u) => (
            <UserRow user={u} onPress={() => goProfile(u)}>
                <PillButton title="Accept" onPress={() => accept(u._id)} loading={busy[u._id]} />
                <PillButton title="Decline" variant="ghost" onPress={() => decline(u._id)} loading={busy[u._id]} />
            </UserRow>
        );
    } else {
        data = results;
        renderRow = (u) => (
            <UserRow user={u} onPress={() => goProfile(u)}>
                <PillButton title="Connect" onPress={() => connect(u._id)} loading={busy[u._id]} />
            </UserRow>
        );
    }

    return (
        <ScreenContainer padded={false}>
            <FlatList
                data={data}
                keyExtractor={(u) => u._id}
                renderItem={({ item }) => renderRow(item)}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.kicker}>NETWORK</Text>
                        <Text style={styles.heading}>Your circle</Text>

                        {/* Tabs */}
                        <View style={styles.tabs}>
                            {TABS.map((t) => (
                                <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
                                    <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                                        {t.label}
                                        {t.key === "requests" && requests.length ? ` (${requests.length})` : ""}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {tab === "find" ? (
                            <View style={styles.searchRow}>
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    onSubmitEditing={doSearch}
                                    placeholder="Search by name or username…"
                                    placeholderTextColor={colors.muted}
                                    style={styles.search}
                                    autoCapitalize="none"
                                    returnKeyType="search"
                                />
                                <PillButton title="Search" onPress={doSearch} loading={searching} />
                            </View>
                        ) : null}
                    </View>
                }
                ListEmptyComponent={
                    loading && tab !== "find" ? (
                        <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
                    ) : (
                        <Text style={styles.empty}>{emptyText(tab, query)}</Text>
                    )
                }
            />
        </ScreenContainer>
    );
}

function emptyText(tab, query) {
    if (tab === "connections") return "No connections yet.\nFind people and send a request.";
    if (tab === "requests") return "No pending requests.";
    return query.trim().length >= 2 ? "No users found." : "Type a name and search.";
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
    heading: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs, marginBottom: spacing.md },
    tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
    tabActive: { backgroundColor: colors.rust, borderColor: colors.rust },
    tabText: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600" },
    tabTextActive: { color: colors.bg },
    searchRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.sm },
    search: {
        flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
        color: colors.ink, fontSize: font.body, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl, lineHeight: 22 },
});
