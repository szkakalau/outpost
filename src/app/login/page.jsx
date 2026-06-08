'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          padding: 32, maxWidth: 380, width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
        padding: 32, maxWidth: 380, width: '100%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Outpost</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Sign in to find your next customers
          </p>
        </div>

        <form onSubmit={handleMagicLink}>
          <label style={{
            display: 'block', fontSize: 14, fontWeight: 500,
            color: '#374151', marginBottom: 8,
          }}>
            Email address
          </label>
          <input
            type="email"
            required
            placeholder="alex@indie.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              display: 'block', width: '100%', padding: '10px 12px',
              borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14,
              marginBottom: 16, boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {error && (
            <div style={{
              fontSize: 14, color: '#dc2626', marginBottom: 16,
              padding: 12, background: '#fef2f2', borderRadius: 8,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            display: 'block', width: '100%', padding: '10px 12px',
            borderRadius: 8, background: loading ? '#93c5fd' : '#2563eb',
            color: '#fff', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: loading ? 'default' : 'pointer',
          }}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
          No password needed. We'll email you a login link.
        </p>
      </div>
    </div>
  );
}
