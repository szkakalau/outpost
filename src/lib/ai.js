const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

async function deepseekComplete(systemPrompt, userPrompt, { temperature = 0.3, maxTokens = 300 } = {}) {
  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    throw new Error(`DeepSeek ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || '';
}

const SCORING_PROMPT = `You are an indie developer growth expert. Score this post on lead intent (1-5):
5 - Explicitly looking for a solution, ready to buy
4 - Strong pain point, likely receptive
3 - Relevant discussion, natural opportunity
2 - Casual mention, unlikely customer
1 - Irrelevant or pure sharing

Return ONLY valid JSON: {"score":4,"intent":"looking_for_tool","reason":"...","angle":"...","keywords_matched":[...]}`;

const DRAFT_PROMPT = `You are an indie developer helping others. Generate helpful, genuine replies. 2-4 sentences, sound like a real developer NOT marketing. Only mention your product if it genuinely solves their problem.

Angles:
- empathy_recommend: Empathize, share similar experience, naturally mention your product
- question_guide: Ask thoughtful question, mention product as one approach
- value_first: Lead with concrete insight, briefly mention product

Return ONLY valid JSON: {"drafts":[{"angle":"empathy_recommend","text":"..."},{"angle":"question_guide","text":"..."},{"angle":"value_first","text":"..."}]}`;

const LABELS = { 5: 'ready_to_buy', 4: 'strong_intent', 3: 'relevant_discussion', 2: 'casual_mention', 1: 'not_relevant' };

export async function scoreLeads(posts, productDescription = '') {
  const product = productDescription || 'A SaaS tool for developers';
  const results = [];
  for (const post of posts) {
    const prompt = `PRODUCT: ${product}\nCHANNEL: ${post.channel}\n${post.subreddit ? `SUBREDDIT: r/${post.subreddit}` : ''}\nTITLE: ${post.title}\nBODY: ${(post.body || '').slice(0, 1500)}`;
    try {
      const raw = await deepseekComplete(SCORING_PROMPT, prompt);
      const cleaned = raw.replace(/```(?:json)?\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      results.push({
        ...post, score: parseInt(parsed.score) || 1,
        intent: parsed.intent || 'unknown', reason: parsed.reason || '',
        angle: parsed.angle || '', keywords_matched: parsed.keywords_matched || [],
        intent_label: LABELS[parseInt(parsed.score)] || 'unknown',
      });
    } catch (e) {
      console.error(`[ai] Score error: ${e.message}`);
      results.push({ ...post, score: 1, intent: 'error', reason: e.message, angle: '', keywords_matched: [], intent_label: 'not_relevant' });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

export async function generateDrafts(lead, productDescription = '') {
  const prompt = `YOUR PRODUCT: ${productDescription || 'A SaaS tool for developers'}\nCHANNEL: ${lead.channel}\n${lead.subreddit ? `SUBREDDIT: r/${lead.subreddit}` : ''}\nPOST TITLE: ${lead.title}\nPOST BODY: ${(lead.body || '').slice(0, 1500)}`;
  try {
    const raw = await deepseekComplete(DRAFT_PROMPT, prompt, { temperature: 0.7, maxTokens: 600 });
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return (parsed.drafts || []).map((d) => ({ angle: d.angle, text: (d.text || '').slice(0, 500) }));
  } catch (e) {
    console.error(`[ai] Draft error: ${e.message}`);
    return [];
  }
}
