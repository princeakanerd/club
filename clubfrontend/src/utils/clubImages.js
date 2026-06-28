// Demo imagery for clubs that haven't uploaded a cover/logo yet.
// Deterministic: the same club always maps to the same image.

// Curated Unsplash photos per category (free to hotlink via images.unsplash.com).
const COVERS = {
    TECHNICAL: [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80",
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&q=80",
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&q=80",
    ],
    CULTURAL: [
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80",
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80",
        "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&q=80",
    ],
    SPORTS: [
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=80",
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
        "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=900&q=80",
    ],
    LITERARY: [
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=80",
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&q=80",
        "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=900&q=80",
    ],
    SOCIAL: [
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=80",
        "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=900&q=80",
        "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=80",
    ],
    OTHER: [
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&q=80",
        "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=900&q=80",
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80",
    ],
};

// Turn a club id into a stable small number so the same club picks the same image.
function hash(str = "") {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

export function getCoverImage(club) {
    if (club?.coverImage) return club.coverImage;
    const list = COVERS[club?.category] || COVERS.OTHER;
    return list[hash(club?._id) % list.length];
}

export function getLogoImage(club) {
    if (club?.logo) return club.logo;
    // DiceBear generates a unique, colorful avatar from a seed — perfect logo fallback.
    const seed = encodeURIComponent(club?.name || club?._id || "club");
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=1f3d2e,c99a3b,5e7a63`;
}
