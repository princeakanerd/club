import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import ClubCard from "../components/ClubCard";
import usePaginatedList from "../hooks/usePaginatedList";
import { colors, radius, font, spacing } from "../theme";

const CATEGORIES = ["TECHNICAL", "CULTURAL", "SPORTS", "LITERARY", "SOCIAL", "OTHER"];
const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

export default function ExploreScreen({ navigation }) {
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState(""); // debounced value actually sent
    const [category, setCategory] = useState("");

    // Debounce the search box so we don't fire a request per keystroke.
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;

    const list = usePaginatedList("/clubs", params, { limit: 15 });

    // Reload whenever the filters change.
    useEffect(() => {
        list.load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, category]);

    const renderHeader = useCallback(
        () => (
            <View>
                <Text style={styles.kicker}>DISCOVER</Text>
                <Text style={styles.title}>Explore clubs</Text>

                <TextInput
                    value={searchInput}
                    onChangeText={setSearchInput}
                    placeholder="Search clubs…"
                    placeholderTextColor={colors.muted}
                    style={styles.search}
                    autoCapitalize="none"
                    returnKeyType="search"
                />

                {/* Category chips */}
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={["", ...CATEGORIES]}
                    keyExtractor={(c) => c || "all"}
                    contentContainerStyle={styles.chipRow}
                    renderItem={({ item }) => {
                        const active = category === item;
                        return (
                            <Pressable
                                onPress={() => setCategory(item)}
                                style={[styles.chip, active && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {item ? cap(item) : "All"}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>
        ),
        [searchInput, category]
    );

    return (
        <ScreenContainer padded={false}>
            <FlatList
                data={list.items}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <ClubCard club={item} onPress={() => navigation.navigate("ClubDetail", { clubId: item._id, name: item.name })} />
                )}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                onEndReached={list.loadMore}
                onEndReachedThreshold={0.4}
                refreshing={list.refreshing}
                onRefresh={list.refresh}
                ListEmptyComponent={
                    list.loading ? (
                        <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.xl }} />
                    ) : list.error ? (
                        <Text style={styles.empty}>{list.error}</Text>
                    ) : (
                        <Text style={styles.empty}>No clubs match your search.</Text>
                    )
                }
                ListFooterComponent={
                    list.loadingMore ? <ActivityIndicator color={colors.muted} style={{ marginVertical: spacing.md }} /> : null
                }
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    kicker: { color: colors.rust, fontSize: font.tiny, fontWeight: "700", letterSpacing: 2, marginTop: spacing.md },
    title: { color: colors.ink, fontSize: font.h1, fontWeight: "700", marginTop: spacing.xs, marginBottom: spacing.md },
    search: {
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        color: colors.ink,
        fontSize: font.body,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    chipRow: { gap: spacing.sm, paddingVertical: spacing.md },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: "transparent",
    },
    chipActive: { backgroundColor: colors.rust, borderColor: colors.rust },
    chipText: { color: colors.inkSoft, fontSize: font.small, fontWeight: "600" },
    chipTextActive: { color: colors.bg },
    empty: { color: colors.muted, fontSize: font.body, textAlign: "center", marginTop: spacing.xl },
});
