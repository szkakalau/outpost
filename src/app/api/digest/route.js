import scanReddit from '@/lib/channels/reddit';
import scanHackerNews from '@/lib/channels/hackernews';
import { scoreLeads, generateDrafts } from '@/lib/ai';
import { sendDailyDigest } from '@/lib/email';

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const toEmail = process.env.DIGEST_EMAIL;

  try {
    const [redditPosts, hnPosts] = await Promise.all([
      scanReddit(),
      scanHackerNews(),
    ]);

    const allPosts = [...redditPosts, ...hnPosts];
    if (allPosts.length === 0) {
      return Response.json({ sent: false, reason: 'no_posts' });
    }

    const scored = await scoreLeads(allPosts);
    const highIntent = scored.filter((s) => s.score >= 3);
    const top = highIntent.slice(0, 3);

    const leadsWithDrafts = await Promise.all(
      top.map(async (lead) => {
        const drafts = await generateDrafts(lead);
        return { lead, drafts };
      })
    );

    const result = await sendDailyDigest(toEmail, {
      leadsWithDrafts,
      totalScanned: allPosts.length,
      totalScored: scored.length,
    });

    return Response.json(result);
  } catch (e) {
    console.error(`[digest] ${e.message}`);
    return Response.json({ sent: false, error: e.message });
  }
}
