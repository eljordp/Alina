import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerSupabase } from '@/lib/supabase-server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);

      // Get the connected Gmail address
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Store refresh token for this user (upsert — one Gmail per user)
      await supabaseAdmin.from('user_gmail_accounts').upsert({
        user_id: user.id,
        gmail_email: profile.data.emailAddress,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
      return NextResponse.json({ error: 'Token exchange failed', details: String(error) }, { status: 500 });
    }
  }

  // No code — redirect to Google consent screen
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  });

  return NextResponse.redirect(authUrl);
}
