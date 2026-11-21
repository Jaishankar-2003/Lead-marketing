import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeBusinessName } from '@/lib/vendors/duplicateEngine';
import { normalizeIndianPhone } from '@/lib/vendors/phoneUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const batchId = body.batchId?.trim();
    const mode = body.mode || 'UPDATE_EXISTING'; // 'ADD_NEW' | 'UPDATE_EXISTING' | 'SKIP_DUPLICATES' | 'MANUAL_REVIEW'

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'batchId is required' },
        { status: 400 }
      );
    }

    const batch = await prisma.vendorImportBatch.findUnique({
      where: { id: batchId },
      include: {
        records: {
          include: {
            matchVendor: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Import batch not found' },
        { status: 404 }
      );
    }

    if (batch.status === 'COMMITTED') {
      return NextResponse.json(
        { success: false, error: 'Batch has already been committed' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let reviewCount = 0;

    // Scan all existing vendor codes to find the true max numeric sequence
    const allExistingCodes = await prisma.vendor.findMany({
      where: { vendorCode: { startsWith: 'VEN-' } },
      select: { vendorCode: true },
    });

    let currentVendorSeq = 0;
    for (const v of allExistingCodes) {
      const match = v.vendorCode.match(/^VEN-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > currentVendorSeq) {
          currentVendorSeq = num;
        }
      }
    }

    for (const record of batch.records) {
      const isExactDuplicate = record.matchType === 'EXACT_PHONE' || record.matchType === 'INTRA_BATCH_PHONE';
      const isHighMatch = record.matchType === 'NAME_AND_LOCATION' || record.matchType === 'HIGH';

      // Mode: SKIP_DUPLICATES
      if (mode === 'SKIP_DUPLICATES' && (isExactDuplicate || isHighMatch)) {
        await prisma.vendorImportRecord.update({
          where: { id: record.id },
          data: { action: 'SKIPPED' },
        });
        skippedCount++;
        continue;
      }

      // Mode: MANUAL_REVIEW
      if (mode === 'MANUAL_REVIEW' && (isExactDuplicate || isHighMatch)) {
        await prisma.vendorImportRecord.update({
          where: { id: record.id },
          data: { action: 'REVIEW' },
        });
        reviewCount++;
        continue;
      }

      // Mode: UPDATE_EXISTING
      if (record.matchVendorId && (isExactDuplicate || isHighMatch)) {
        const vId = record.matchVendorId;

        // Check if there are new phones to add to this existing vendor
        for (const phone of record.phones) {
          const norm = normalizeIndianPhone(phone);
          const existingContact = await prisma.vendorContact.findFirst({
            where: {
              vendorId: vId,
              normalized: norm.normalized || phone,
            },
          });

          if (!existingContact) {
            await prisma.vendorContact.create({
              data: {
                vendorId: vId,
                type: 'PHONE',
                value: phone,
                normalized: norm.normalized || phone,
                kind: norm.type,
                isWhatsApp: norm.canWhatsApp,
                isValid: norm.isValid,
                source: 'EXCEL_IMPORT',
              },
            });
          }
        }

        // Update location if existing vendor didn't have one
        const updates: any = {};
        if (record.cityId && !record.matchVendor?.cityId) updates.cityId = record.cityId;
        if (record.stateId && !record.matchVendor?.stateId) updates.stateId = record.stateId;
        if (record.areaId && !record.matchVendor?.areaId) updates.areaId = record.areaId;
        if (record.address && !record.matchVendor?.fullAddress) updates.fullAddress = record.address;

        if (Object.keys(updates).length > 0) {
          await prisma.vendor.update({
            where: { id: vId },
            data: updates,
          });
        }

        await prisma.vendorImportRecord.update({
          where: { id: record.id },
          data: {
            action: 'UPDATED',
            vendorId: vId,
          },
        });

        updatedCount++;
        continue;
      }

      // Default: Create new vendor with verified collision-free vendorCode
      currentVendorSeq++;
      let vendorCode = `VEN-${String(currentVendorSeq).padStart(4, '0')}`;
      while (await prisma.vendor.findUnique({ where: { vendorCode }, select: { id: true } })) {
        currentVendorSeq++;
        vendorCode = `VEN-${String(currentVendorSeq).padStart(4, '0')}`;
      }
      const name = record.name || `Vendor ${vendorCode}`;
      const normalizedName = normalizeBusinessName(name);

      const contactsToCreate: any[] = [
        ...record.phones.map((p, idx) => {
          const norm = normalizeIndianPhone(p);
          const labelMatch = p.match(/\(([^)]+)\)/);
          const customLabel = labelMatch ? labelMatch[1].trim() : (idx === 0 ? 'Primary' : `Phone ${idx + 1}`);
          return {
            type: 'PHONE',
            value: p,
            normalized: norm.normalized || p,
            kind: norm.type,
            label: customLabel,
            isPrimary: idx === 0,
            isWhatsApp: norm.canWhatsApp,
            isValid: norm.isValid,
            source: 'EXCEL_IMPORT',
          };
        }),
        ...record.emails.map((e, idx) => ({
          type: 'EMAIL',
          value: e,
          normalized: e.toLowerCase().trim(),
          kind: 'EMAIL',
          label: idx === 0 ? 'Primary' : `Email ${idx + 1}`,
          isPrimary: idx === 0 && record.phones.length === 0,
          isValid: e.includes('@'),
          source: 'EXCEL_IMPORT',
        })),
      ];

      const newVendor = await prisma.vendor.create({
        data: {
          vendorCode,
          name,
          normalizedName,
          status: record.validationStatus === 'WARNING' ? 'VERIFICATION_PENDING' : 'ACTIVE',
          stateId: record.stateId,
          districtId: record.districtId,
          cityId: record.cityId,
          areaId: record.areaId,
          fullAddress: record.address,
          source: 'EXCEL_IMPORT',
          contacts: {
            create: contactsToCreate,
          },
          activities: {
            create: {
              type: 'IMPORT',
              content: `Imported from file "${batch.fileName}" (Batch ${batch.id.slice(-6)}).`,
            },
          },
        },
      });

      await prisma.vendorImportRecord.update({
        where: { id: record.id },
        data: {
          action: 'IMPORTED',
          vendorId: newVendor.id,
        },
      });

      importedCount++;
    }

    // Update batch record
    await prisma.vendorImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMMITTED',
        mode,
        importedCount,
        updatedCount,
        skippedCount,
        reviewCount,
        committedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: batch.records.length,
        importedCount,
        updatedCount,
        skippedCount,
        reviewCount,
      },
    });
  } catch (error) {
    console.error('POST /api/vendors/import/commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to commit import batch' },
      { status: 500 }
    );
  }
}
