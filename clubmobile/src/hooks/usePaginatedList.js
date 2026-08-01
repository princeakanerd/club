import { useState, useCallback, useRef } from "react";
import api, { apiErrorMessage } from "../api/client";

/* Reusable cursor-pagination hook for the backend's list endpoints.
   The backend returns { data: [...], meta: { nextCursor, hasMore } }.

   Usage:
     const list = usePaginatedList("/clubs", { search, category });
     ...FlatList data={list.items} onEndReached={list.loadMore}
        refreshing={list.refreshing} onRefresh={list.refresh}
*/
export default function usePaginatedList(path, params = {}, { limit = 15 } = {}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false); // first page
    const [refreshing, setRefreshing] = useState(false); // pull-to-refresh
    const [loadingMore, setLoadingMore] = useState(false); // next page
    const [error, setError] = useState("");
    const [hasMore, setHasMore] = useState(true);

    const cursorRef = useRef(null);
    // Serialize params so a changed filter triggers a fresh load, and guard
    // against out-of-order responses.
    const reqIdRef = useRef(0);

    const fetchPage = useCallback(
        async ({ reset }) => {
            const reqId = ++reqIdRef.current;
            try {
                const res = await api.get(path, {
                    params: { ...params, limit, ...(reset ? {} : { cursor: cursorRef.current || undefined }) },
                });
                if (reqId !== reqIdRef.current) return; // a newer request superseded this
                const newItems = res.data.data || [];
                const meta = res.data.meta || {};
                cursorRef.current = meta.nextCursor || null;
                setHasMore(!!meta.hasMore);
                setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
                setError("");
            } catch (err) {
                if (reqId === reqIdRef.current) setError(apiErrorMessage(err, "Couldn't load."));
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [path, JSON.stringify(params), limit]
    );

    // Initial / filter-changed load
    const load = useCallback(async () => {
        setLoading(true);
        cursorRef.current = null;
        await fetchPage({ reset: true });
        setLoading(false);
    }, [fetchPage]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        cursorRef.current = null;
        await fetchPage({ reset: true });
        setRefreshing(false);
    }, [fetchPage]);

    const loadMore = useCallback(async () => {
        if (loadingMore || loading || !hasMore || !cursorRef.current) return;
        setLoadingMore(true);
        await fetchPage({ reset: false });
        setLoadingMore(false);
    }, [fetchPage, loadingMore, loading, hasMore]);

    return { items, loading, refreshing, loadingMore, error, hasMore, load, refresh, loadMore };
}
