import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeBusinessName } from '@/lib/vendors/duplicateEngine';
import { normalizeIndianPhone } from '@/lib/vendors/phoneUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId')?.trim();

    const where: any = {
      action: 'REVIEW',
    };
    if (batchId) where.batchId = batchId;

    const records = await prisma.vendorImportRecord.findMany({
      where,
      include: {
        batch: {
          select: { fileName: true },
        },
        matchVendor: {
          include: {
            contacts: true,
            city: true,
            area: true,
          },
        },
      },
      orderBy: { sourceRow: 'asc' },
    });

    return NextResponse.json({
      success: true,
      pendingReviews: records,
    });
  } catch (error) {
    console.error('GET /api/vendors/duplicates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch duplicate review records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const recordId = body.recordId?.trim();
    const decision = body.decision; // 'MERGE' | 'KEEP_SEPARATE' | 'SKIP'

    if (!recordId || !decision) {
      return NextResponse.json(
        { success: false, error: 'recordId and decision are required' },
        { status: 400 }
      );
    }

    const record = await prisma.vendorImportRecord.findUnique({
      where: { id: recordId },
      include: { matchVendor: true },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    if (decision === 'SKIP') {
      await prisma.vendorImportRecord.update({
        where: { id: recordId },
        data: { action: 'SKIPPED', resolutionNote: 'Skipped by user in duplicate review.' },
      });
      return NextResponse.json({ success: true, action: 'SKIPPED' });
    }

    if (decision === 'MERGE' && record.matchVendorId) {
      const vId = record.matchVendorId;

      // Add missing phones to existing vendor
      for (const phone of record.phones) {
        const norm = normalizeIndianPhone(phone);
        const existing = await prisma.vendorContact.findFirst({
          where: { vendorId: vId, normalized: norm.normalized || phone },
        });
        if (!existing) {
          await prisma.vendorContact.create({
            data: {
              vendorId: vId,
              type: 'PHONE',
              value: phone,
              normalized: norm.normalized || phone,
              kind: norm.type,
              isWhatsApp: norm.canWhatsApp,
              isValid: norm.isValid,
              source: 'MANUAL_MERGE',
            },
          });
        }
      }

      await prisma.vendorImportRecord.update({
        where: { id: recordId },
        data: {
          action: 'MERGED',
          vendorId: vId,
          resolutionNote: `Merged into existing vendor ${record.matchVendor?.name}.`,
        },
      });

      await prisma.vendorActivityLog.create({
        data: {
          vendorId: vId,
          type: 'MERGE',
          content: `Import record "${record.name}" manually merged into vendor.`,
        },
      });

      return NextResponse.json({ success: true, action: 'MERGED' });
    }

    if (decision === 'KEEP_SEPARATE') {
      const count = await prisma.vendor.count();
      const vendorCode = `VEN-${String(count + 1).padStart(4, '0')}`;
      const name = record.name || `Vendor ${vendorCode}`;
      const normalizedName = normalizeBusinessName(name);

      const newVendor = await prisma.vendor.create({
        data: {
          vendorCode,
          name,
          normalizedName,
          status: 'ACTIVE',
          stateId: record.stateId,
          cityId: record.cityId,
          areaId: record.areaId,
          fullAddress: record.address,
          source: 'DUPLICATE_REVIEW_OVERRIDE',
          contacts: {
            create: record.phones.map((p, idx) => {
              const norm = normalizeIndianPhone(p);
              return {
                type: 'PHONE',
                value: p,
                normalized: norm.normalized || p,
                kind: norm.type,
                label: idx === 0 ? 'Primary' : 'Alternative',
                isPrimary: idx === 0,
                isWhatsApp: norm.canWhatsApp,
                isValid: norm.isValid,
                source: 'MANUAL_REVIEW',
              };
            }),
          },
          activities: {
            create: {
              type: 'IMPORT',
              content: `Created as separate vendor after duplicate review.`,
            },
          },
        },
      });

      await prisma.vendorImportRecord.update({
        where: { id: recordId },
        data: {
          action: 'SEPARATE',
          vendorId: newVendor.id,
          resolutionNote: 'Created as separate vendor by manual review.',
        },
      });

      return NextResponse.json({ success: true, action: 'SEPARATE', vendor: newVendor });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid decision' },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/vendors/duplicates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve duplicate' },
      { status: 500 }
    );
  }
}
