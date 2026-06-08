const REDDIT_BASE = 'https://www.reddit.com';
const REDDIT_PROXY = process.env.REDDIT_PROXY_URL || '';

function proxyUrl(original) {
  if (!REDDIT_PROXY) return original;
  return REDDIT_PROXY.replace('{url}', encodeURIComponent(original));
}

async function fetchSubreddit(subreddit, limit = 25) {
  const url = proxyUrl(`${REDDIT_BASE}/r/${subreddit}/new.json?limit=${limit}`);
  const headers = REDDIT_PROXY ? {} : { 'User-Agent': 'Outpost/0.1.0' };
  const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });

  if (resp.status === 429 || resp.status === 403) {
    return await fetchSubredditFallback(subreddit, limit);
  }
  if (!resp.ok) throw new Error(`Reddit ${resp.status} for r/${subreddit}`);
  const data = await resp.json();
  return (data?.data?.children || [])
    .filter((c) => c.kind === 't3')
    .map((c) => parsePost(c.data, subreddit));
}

async function fetchSubredditFallback(subreddit, limit = 25) {
  const url = proxyUrl(`https://api.pushshift.io/reddit/submission/search?subreddit=${subreddit}&size=${limit}&sort=desc&sort_type=created_utc`);
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data?.data || []).map((p) => parsePushshiftPost(p, subreddit));
}

function parsePost(raw, subreddit) {
  return {
    id: raw.id || '', title: raw.title || '', body: raw.selftext || '',
    author: raw.author || 'unknown', channel: 'reddit', subreddit,
    url: raw.permalink ? `https://www.reddit.com${raw.permalink}` : '',
    created_at: raw.created_utc ? new Date(raw.created_utc * 1000).toISOString() : null,
    reply_count: raw.num_comments || 0, score: raw.score || 0,
  };
}

function parsePushshiftPost(raw, subreddit) {
  return {
    id: raw.id || '', title: raw.title || '', body: raw.selftext || '',
    author: raw.author || 'unknown', channel: 'reddit', subreddit,
    url: raw.full_link || '',
    created_at: raw.created_utc ? new Date(raw.created_utc * 1000).toISOString() : null,
    reply_count: raw.num_comments || 0, score: raw.score || 0,
  };
}

export default async function scanReddit(subreddits = ['SaaS', 'indiehackers', 'webdev', 'SideProject', 'startups']) {
  const results = await Promise.allSettled(subreddits.map((sub) => fetchSubreddit(sub)));
  const posts = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') posts.push(...results[i].value);
    else console.error(`[reddit] r/${subreddits[i]}: ${results[i].reason?.message || results[i].reason}`);
  }
  return posts;
}
