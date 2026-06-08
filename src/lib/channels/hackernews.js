const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

async function fetchItems(ids) {
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const resp = await fetch(`${HN_BASE}/item/${id}.json`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data || data.type !== 'story') return null;
      return {
        id: String(data.id || ''), title: data.title || '', body: data.text || '',
        author: data.by || 'unknown', channel: 'hackernews', subreddit: null,
        url: data.url || `https://news.ycombinator.com/item?id=${id}`,
        created_at: data.time ? new Date(data.time * 1000).toISOString() : null,
        reply_count: data.descendants || 0, score: data.score || 0,
      };
    })
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
}

export default async function scanHackerNews(keywords = []) {
  try {
    const [newIds, showIds] = await Promise.all([
      fetch(`${HN_BASE}/newstories.json`).then((r) => r.json()),
      fetch(`${HN_BASE}/showstories.json`).then((r) => r.json()),
    ]);
    const allIds = [...new Set([...(newIds || []), ...(showIds || [])])].slice(0, 75);
    const posts = await fetchItems(allIds);
    if (!keywords || keywords.length === 0) {
      return posts.filter((p) => {
        const t = p.title.toLowerCase();
        return t.startsWith('show hn') || t.startsWith('ask hn');
      });
    }
    const lower = keywords.map((k) => k.toLowerCase());
    return posts.filter((p) => {
      const t = p.title.toLowerCase();
      if (t.startsWith('show hn') || t.startsWith('ask hn')) return true;
      return lower.some((kw) => t.includes(kw));
    });
  } catch (e) {
    console.error(`[hn] ${e.message}`);
    return [];
  }
}
