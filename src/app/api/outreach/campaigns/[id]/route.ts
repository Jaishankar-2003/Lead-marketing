import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  pauseEmailCampaign,
  recomputeCampaignCounts,
  startOrResumeEmailCampaign,
  stopEmailCampaign,
} from '@/outreach/campaign-runner';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: params.id },
      include: {
        template: { select: { id: true, name: true, category: true } },
        recipients: {
          include: {
            lead: {
              select: {
                id: true,
                businessName: true,
                city: true,
                category: true,
                phone: true,
                enrichedPhone: true,
                doNotContact: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('GET /api/outreach/campaigns/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign details' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action.toUpperCase() : '';

    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: params.id },
    });
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'PAUSE') {
      await pauseEmailCampaign(campaign.id);
    } else if (action === 'RESUME') {
      const origin =
        process.env.APP_BASE_URL?.trim() ||
        request.headers.get('origin') ||
        `http://${request.headers.get('host') || 'localhost:3000'}`;
      await startOrResumeEmailCampaign(campaign.id, origin);
    } else if (action === 'STOP') {
      await stopEmailCampaign(campaign.id);
    } else if (action === 'SKIP_RECIPIENT' && typeof body.recipientId === 'string') {
      await prisma.outreachRecipient.updateMany({
        where: { id: body.recipientId, campaignId: campaign.id },
        data: { status: 'SKIPPED', errorDetails: 'Skipped by user' },
      });
      await recomputeCampaignCounts(campaign.id);
    } else if (action === 'MARK_COMPLETED') {
      await recomputeCampaignCounts(campaign.id);
      await prisma.outreachCampaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid campaign action' }, { status: 400 });
    }

    const updated = await prisma.outreachCampaign.findUnique({
      where: { id: campaign.id },
      include: {
        recipients: {
          include: {
            lead: {
              select: {
                id: true,
                businessName: true,
                city: true,
                category: true,
                phone: true,
                enrichedPhone: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error) {
    console.error('POST /api/outreach/campaigns/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

