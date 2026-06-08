import scanReddit from '@/lib/channels/reddit';
import scanHackerNews from '@/lib/channels/hackernews';
import { scoreLeads, generateDrafts } from '@/lib/ai';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { subreddits, keywords, product_description } = body;

    const [redditPosts, hnPosts] = await Promise.all([
      scanReddit(subreddits),
      scanHackerNews(keywords),
    ]);

    const allPosts = [...redditPosts, ...hnPosts];

    if (allPosts.length === 0) {
      return Response.json({ leads: [], total_scanned: 0, total_scored: 0, high_intent_count: 0 });
    }

    const scored = await scoreLeads(allPosts, product_description || '');
    const highIntent = scored.filter((s) => s.score >= 3);
    const top = highIntent.slice(0, 3);

    const leadsWithDrafts = await Promise.all(
      top.map(async (lead) => {
        const drafts = await generateDrafts(lead, product_description || '');
        return { lead, drafts };
      })
    );

    return Response.json({
      leads: leadsWithDrafts,
      total_scanned: allPosts.length,
      total_scored: scored.length,
      high_intent_count: highIntent.length,
    });
  } catch (e) {
    console.error(`[api/scan] ${e.message}`);
    return Response.json({ error: e.message || 'Scan failed' }, { status: 500 });
  }
}
