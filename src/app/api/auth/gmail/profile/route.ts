import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ email: null });
    }

    const { data: gmailAccount } = await supabase
      .from('user_gmail_accounts')
      .select('gmail_email')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ email: gmailAccount?.gmail_email || null });
  } catch {
    return NextResponse.json({ email: null });
  }
}
