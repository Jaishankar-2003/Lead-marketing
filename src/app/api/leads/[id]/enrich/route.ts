import { NextRequest, NextResponse } from 'next/server';
import { enrichLeadRecord } from '@/enrichment/enricher';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedLead = await enrichLeadRecord(params.id);
    return NextResponse.json({
      success: true,
      message: 'Website enrichment completed successfully',
      data: updatedLead,
    });
  } catch (err: any) {
    console.error(`Enrichment failed for lead ${params.id}:`, err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
