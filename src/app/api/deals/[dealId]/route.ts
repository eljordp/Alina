import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId } = await params;

  // RLS ensures only user's own deals are returned
  const [dealResult, docsResult] = await Promise.all([
    supabase.from('deals').select('*').eq('id', dealId).single(),
    supabase.from('documents').select('*').eq('deal_id', dealId).order('created_at', { ascending: true }),
  ]);

  if (dealResult.error) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  return NextResponse.json({
    deal: dealResult.data,
    documents: docsResult.data || [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.application_data) {
    updateData.application_data = body.application_data;
  }

  if (body.status) {
    updateData.status = body.status;
  }

  // RLS ensures only user's own deals can be updated
  const { data, error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', dealId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity (best-effort)
  try {
    if (body.status) {
      await supabase.from('activity_log').insert({
        deal_id: dealId,
        action: 'status_changed',
        details: `Status changed to ${body.status}`,
      });
    }
    if (body.application_data && !body.status) {
      await supabase.from('activity_log').insert({
        deal_id: dealId,
        action: 'application_saved',
        details: 'Application data saved by loan officer',
      });
    }
  } catch {
    // activity_log table may not exist yet
  }

  return NextResponse.json(data);
}
