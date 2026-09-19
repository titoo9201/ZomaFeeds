const SAAVN_API_BASE_URL = process.env.SAAVN_API_BASE_URL || 'https://jiosaavn-api-o119.onrender.com/api';
// The Render free-tier instance sleeps after 15 min idle and can take 30-50s to cold-start,
// so this timeout is well above a typical warm response but still bounded.
const SEARCH_TIMEOUT_MS = 25000;

function pickImage(images) {
    if (!Array.isArray(images) || !images.length) return '';
    const best = images[images.length - 1];
    return best?.url || best?.link || '';
}

function pickAudioUrl(downloadUrl) {
    if (!Array.isArray(downloadUrl) || !downloadUrl.length) return '';
    const preferred = downloadUrl.find(item => item.quality === '160kbps') || downloadUrl[downloadUrl.length - 1];
    return preferred?.url || preferred?.link || '';
}

function pickArtist(item) {
    const names = item.artists?.primary?.map(artist => artist.name).filter(Boolean);
    if (names?.length) return names.join(', ');
    return item.primaryArtists || item.subtitle || 'Unknown artist';
}

const HTML_ENTITIES = { '&quot;': '"', '&amp;': '&', '&#039;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>' };
function decodeHtmlEntities(text) {
    if (!text) return text;
    return text.replace(/&quot;|&amp;|&#039;|&apos;|&lt;|&gt;/g, match => HTML_ENTITIES[match]);
}

async function searchSongs(req, res) {
    const query = req.query.query?.trim();
    if (!query) return res.status(400).json({ message: 'A search query is required' });

    let response;
    try {
        response = await fetch(`${SAAVN_API_BASE_URL}/search/songs?query=${encodeURIComponent(query)}&limit=15`, {
            signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
        });
    } catch (error) {
        const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
        return res.status(502).json({ message: timedOut ? 'Song search is taking too long to respond. Please try again in a moment.' : 'Song search is temporarily unavailable' });
    }

    if (!response.ok) return res.status(502).json({ message: 'Song search is temporarily unavailable' });

    const payload = await response.json().catch(() => null);
    const results = payload?.data?.results || payload?.results || [];

    const songs = results
        .map(item => ({
            id: item.id,
            title: decodeHtmlEntities(item.name || item.title || 'Untitled'),
            artist: decodeHtmlEntities(pickArtist(item)),
            image: pickImage(item.image),
            previewUrl: pickAudioUrl(item.downloadUrl),
            duration: item.duration ? Number(item.duration) : null
        }))
        .filter(song => song.previewUrl);

    res.json({ songs });
}

module.exports = { searchSongs };
