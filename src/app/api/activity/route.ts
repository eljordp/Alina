import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET activity log for a deal
export async function GET(request: NextRequest) {
  const dealId = request.nextUrl.searchParams.get('dealId');

  if (!dealId) {
    return NextResponse.json({ error: 'dealId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('activity_log')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST to create a new activity entry
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deal_id, action, details } = body;

  if (!deal_id || !action) {
    return NextResponse.json({ error: 'deal_id and action required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('activity_log')
    .insert({ deal_id, action, details })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
