'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [draftsMap, setDraftsMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ scanned: 0, scored: 0, high: 0 });

  const [productDesc, setProductDesc] = useState('');
  const currentDrafts = selected?.id ? (draftsMap[selected.id] || []) : [];

  const handleScan = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddits: ['SaaS', 'indiehackers', 'webdev', 'SideProject', 'startups'],
          product_description: productDesc,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const apiLeads = data.leads.map((l) => l.lead);
      setLeads(apiLeads);

      const map = {};
      data.leads.forEach((l) => { map[l.lead.id] = l.drafts || []; });
      setDraftsMap(map);

      setSelected(apiLeads[0] || null);
      setStats({ scanned: data.total_scanned, scored: data.total_scored, high: data.high_intent_count });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (lead) => { setSelected(lead); };

  const handleSkip = (lead) => {
    setLeads(leads.filter((l) => l.id !== lead.id));
    if (selected?.id === lead.id) setSelected(null);
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); };

  const s = { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 };
  const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color .2s' };
  const selectedCard = { ...cardStyle, border: '2px solid #2563eb' };
  const scoreColors = { 5: '#22c55e', 4: '#16a34a', 3: '#eab308', 2: '#94a3b8', 1: '#94a3b8' };

  return (
    <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[{ v: stats.scanned, l: 'Scanned' }, { v: stats.scored, l: 'AI Scored' }, { v: stats.high, l: 'High Intent' }, { v: leads.length, l: 'Leads Shown' }].map((m, i) => (
          <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{m.v}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{m.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Your Product</label>
        <input
          type="text"
          value={productDesc}
          onChange={(e) => setProductDesc(e.target.value)}
          placeholder="e.g. An AI-powered CI/CD pipeline generator for small teams"
          style={{ width: '100%', maxWidth: 500, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Describe your product so our AI finds the right leads.</div>
      </div>

      <div style={s}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Today's Leads</h2>
        <button onClick={handleScan} disabled={loading}
          style={{ padding: '8px 20px', borderRadius: 8, background: loading ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 600, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Scanning...' : 'Scan Now'}
        </button>
        {error && <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Scanning Reddit & HN...</div>
          <div style={{ fontSize: 14 }}>AI is scoring posts for lead intent. ~30 seconds.</div>
        </div>
      )}

      {!loading && leads.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ready to find your first leads</div>
          <div style={{ fontSize: 14 }}>Click Scan Now to search Reddit and HN.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leads.map((lead) => (
          <div key={lead.id} style={selected?.id === lead.id ? selectedCard : cardStyle}
            onClick={() => handleSelect(lead)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ background: lead.channel === 'reddit' ? '#fff7ed' : '#fef2f2', color: lead.channel === 'reddit' ? '#c2410c' : '#b91c1c', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {lead.channel === 'reddit' ? `r/${lead.subreddit}` : 'HN'}
              </span>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: scoreColors[lead.score] + '20', color: scoreColors[lead.score], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                {lead.score}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{lead.title}</div>
            {lead.body && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.body}</div>}
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              {lead.author} · {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'recently'}
              {lead.reason && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>— {lead.reason}</span>}
            </div>
          </div>
        ))}
      </div>

      {currentDrafts.length > 0 && (
        <div style={{ marginTop: 32, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Reply Drafts — {selected?.title?.slice(0, 50)}...</span>
            <button onClick={() => handleCopy(currentDrafts.map((d) => `[${d.angle}]\n${d.text}`).join('\n\n'))}
              style={{ padding: '6px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Copy All
            </button>
          </div>
          {currentDrafts.map((draft, i) => (
            <div key={i} style={{ padding: '16px 24px', borderBottom: i < currentDrafts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{draft.angle}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }}>{draft.text}</div>
              <button onClick={() => handleCopy(draft.text)}
                style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                Copy This Draft
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
