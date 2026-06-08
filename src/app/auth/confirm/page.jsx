'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    async function verify() {
      try {
        // Get tokens from hash fragment
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'magiclink') {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          );

          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          setStatus('Signed in! Redirecting...');
          setTimeout(() => router.push('/'), 500);
          return;
        }

        setStatus('Invalid login link. Please try again.');
        setTimeout(() => router.push('/login'), 2000);
      } catch (e) {
        setStatus(`Error: ${e.message}`);
        setTimeout(() => router.push('/login'), 2000);
      }
    }

    verify();
  }, [router]);

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif',
    }}>
      <p style={{ fontSize: 16, color: '#374151' }}>{status}</p>
    </div>
  );
}
