import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: GET /api/auth/gmail → redirects to Google consent screen
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // If we have a code, exchange it for tokens (Step 2)
  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);

      // Display the refresh token so it can be copied to .env.local
      return new NextResponse(
        `<html>
          <body style="font-family: monospace; padding: 40px; background: #111; color: #fff;">
            <h1 style="color: #60a5fa;">Alina - Gmail Connected</h1>
            <p>Copy this refresh token into your .env.local file:</p>
            <pre style="background: #222; padding: 16px; border-radius: 8px; word-break: break-all; color: #4ade80;">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
            <p style="color: #888;">Access token (temporary): ${tokens.access_token?.substring(0, 20)}...</p>
            <p style="color: #888;">You can close this tab now.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } catch (error) {
      return NextResponse.json({ error: 'Token exchange failed', details: String(error) }, { status: 500 });
    }
  }

  // No code yet — redirect to Google consent screen
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
