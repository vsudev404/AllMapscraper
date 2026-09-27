export function cleanText(value) {
    if (!value) return null;
    const text = value.replace(/\s+/g, ' ').trim();
    return text.length ? text : null;
}

export function extractLatLngFromUrl(url) {
    if (!url) return { latitude: null, longitude: null };
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) return { latitude: null, longitude: null };
    return { latitude: Number(match[1]), longitude: Number(match[2]) };
}

export function parseRatingAndReviews(ratingRaw, reviewsRaw) {
    const rating = ratingRaw ? Number(String(ratingRaw).replace(',', '.').match(/[\d.]+/)?.[0]) : null;
    const reviewsCount = reviewsRaw
        ? Number(String(reviewsRaw).replace(/[^\d]/g, '')) || null
        : null;
    return {
        rating: Number.isFinite(rating) ? rating : null,
        reviewsCount: Number.isFinite(reviewsCount) ? reviewsCount : null,
    };
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildRecord({
    provider,
    searchQuery,
    title,
    category,
    address,
    phone,
    website,
    rating,
    reviewsCount,
    latitude,
    longitude,
    hours,
    mapUrl,
}) {
    return {
        provider,
        searchQuery,
        title: cleanText(title),
        category: cleanText(category),
        address: cleanText(address),
        phone: cleanText(phone),
        website: cleanText(website),
        rating: rating ?? null,
        reviewsCount: reviewsCount ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        hours: hours ?? null,
        mapUrl: mapUrl ?? null,
        scrapedAt: new Date().toISOString(),
    };
}
