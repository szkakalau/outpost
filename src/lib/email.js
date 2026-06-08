import { Resend } from 'resend';

const FROM = 'Outpost <onboarding@resend.dev>';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 're_placeholder') return null;
  return new Resend(key);
}

export async function sendDailyDigest(toEmail, digest) {
  const resend = getResend();
  if (!resend) return { sent: false, error: 'Resend not configured' };

  const { leadsWithDrafts, totalScanned, totalScored } = digest;

  if (!leadsWithDrafts || leadsWithDrafts.length === 0) {
    return { sent: false, reason: 'no_leads' };
  }

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let html = `<h1>Outpost Daily Digest — ${dateStr}</h1>`;
  html += `<p>Scanned ${totalScanned} posts, found ${leadsWithDrafts.length} high-intent leads.</p><hr>`;

  for (let i = 0; i < leadsWithDrafts.length; i++) {
    const { lead, drafts } = leadsWithDrafts[i];
    html += `<h2>#${i + 1} — Score: ${lead.score}/5 (${lead.intent_label})</h2>`;
    html += `<p><strong>${lead.channel === 'reddit' ? `r/${lead.subreddit}` : 'HN'}</strong>: ${lead.title}</p>`;
    if (lead.url) html += `<p><a href="${lead.url}">View post →</a></p>`;
    html += `<p><em>${lead.reason}</em></p>`;

    for (const draft of drafts) {
      html += `<p><strong>[${draft.angle}]</strong><br>${draft.text}</p>`;
    }
    html += '<hr>';
  }

  html += `<p>Reply by copying a draft and pasting it in the thread.<br>— Outpost</p>`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.OUTPOST_EMAIL_FROM || FROM,
      to: [toEmail],
      subject: `Outpost — ${leadsWithDrafts.length} leads for ${dateStr}`,
      html,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}
