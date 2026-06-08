import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    // No code in query — redirect to client-side handler for hash tokens
    const hash = request.url.includes('#') ? request.url.split('#')[1] : '';
    return NextResponse.redirect(`${origin}/auth/confirm?${hash || request.url.split('?')[1] || ''}`);
  }

  // Exchange code for session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
    body: JSON.stringify({ auth_code: code }),
  });

  const data = await resp.json();

  if (data.error || !data.access_token) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Set session cookie and redirect
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set('sb-access-token', data.access_token, {
    httpOnly: false, secure: false, sameSite: 'lax', path: '/', maxAge: data.expires_in || 3600,
  });
  response.cookies.set('sb-refresh-token', data.refresh_token || '', {
    httpOnly: false, secure: false, sameSite: 'lax', path: '/', maxAge: 86400 * 30,
  });

  return response;
}
