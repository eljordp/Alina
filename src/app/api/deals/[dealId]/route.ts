import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;

  const [dealResult, docsResult] = await Promise.all([
    supabaseAdmin.from('deals').select('*').eq('id', dealId).single(),
    supabaseAdmin.from('documents').select('*').eq('deal_id', dealId).order('created_at', { ascending: true }),
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

  const { data, error } = await supabaseAdmin
    .from('deals')
    .update(updateData)
    .eq('id', dealId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  if (body.status) {
    await supabaseAdmin.from('activity_log').insert({
      deal_id: dealId,
      action: 'status_changed',
      details: `Status changed to ${body.status}`,
    }).catch(() => {});
  }
  if (body.application_data && !body.status) {
    await supabaseAdmin.from('activity_log').insert({
      deal_id: dealId,
      action: 'application_saved',
      details: 'Application data saved by loan officer',
    }).catch(() => {});
  }

  return NextResponse.json(data);
}
