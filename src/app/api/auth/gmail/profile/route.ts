import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/gmail';

export async function GET() {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      return NextResponse.json({ email: null });
    }

    const gmail = getGmailClient(refreshToken);
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return NextResponse.json({ email: profile.data.emailAddress });
  } catch {
    return NextResponse.json({ email: null });
  }
}
