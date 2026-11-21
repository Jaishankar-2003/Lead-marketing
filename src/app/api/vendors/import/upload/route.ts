import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { parseVendorSpreadsheet } from '@/lib/vendors/excelParser';
import { analyzeDuplicates } from '@/lib/vendors/duplicateEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const selectedSheet = formData.get('sheet') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Parse the spreadsheet with horizontal/multi-section auto-detection
    const parseResult = parseVendorSpreadsheet(buffer, selectedSheet || undefined);

    // Run duplicate engine
    const duplicateMatches = await analyzeDuplicates(parseResult.rows);

    // Fetch all locations to associate location IDs
    const allLocations = await prisma.vendorLocation.findMany({
      where: { isActive: true },
      select: { id: true, name: true, normalizedName: true, level: true, aliases: true },
    });

    const findLocId = (name?: string, level?: string) => {
      if (!name) return null;
      const clean = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const match = allLocations.find((l) => {
        if (level && l.level !== level) return false;
        if (l.normalizedName === clean) return true;
        if (l.aliases.some((a) => a.toLowerCase().replace(/[^a-z0-9]/g, '') === clean)) return true;
        return false;
      });
      return match ? match.id : null;
    };

    // Calculate duplicate stats
    let exactDuplicates = 0;
    let highMatches = 0;
    let newRecords = 0;

    for (const m of duplicateMatches) {
      if (m.matchReason === 'EXACT_PHONE' || m.matchReason === 'INTRA_BATCH_PHONE') {
        exactDuplicates++;
      } else if (m.confidenceScore >= 0.7) {
        highMatches++;
      } else {
        newRecords++;
      }
    }

    // Create Draft Import Batch in DB
    const batch = await prisma.vendorImportBatch.create({
      data: {
        fileName: file.name,
        fileHash,
        fileSize: file.size,
        fileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sheetNames: parseResult.sheetNames,
        selectedSheet: parseResult.activeSheet,
        status: 'DRAFT',
        totalRecords: parseResult.totalRows,
        duplicateCount: exactDuplicates + highMatches,
        invalidCount: parseResult.warningRows,
        records: {
          create: duplicateMatches.map((m) => {
            const row = m.incomingRow;
            const cityId = findLocId(row.city, 'CITY');
            const stateId = findLocId(row.state, 'STATE');
            const areaId = findLocId(row.areaMarket, 'MARKET') || findLocId(row.areaMarket, 'AREA');

            return {
              sheetName: parseResult.activeSheet,
              sourceRow: row.rowNumber,
              sectionIndex: row.sectionIndex,
              sectionHeading: row.sectionTitle || null,
              rawData: row.rawRecord,
              name: row.name,
              phones: row.normalizedPhones.map((p) => p.normalized).filter(Boolean),
              emails: row.email ? [row.email] : [],
              address: row.address || null,
              cityId,
              stateId,
              areaId,
              fingerprint: row.normalizedPhones[0]?.normalized || row.name,
              validationStatus: row.hasWarning ? 'WARNING' : 'VALID',
              issues: row.warningMessage ? [row.warningMessage] : [],
              matchType: m.matchReason,
              matchReason: m.matchDescription,
              matchVendorId: m.existingVendorId || null,
              action: m.suggestedAction === 'MANUAL_REVIEW' ? 'REVIEW' : 'PREVIEW',
            };
          }),
        },
      },
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      fileName: file.name,
      fileSize: file.size,
      sheetNames: parseResult.sheetNames,
      activeSheet: parseResult.activeSheet,
      detectedLayout: parseResult.detectedLayout,
      sections: parseResult.sections,
      summary: {
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        warningRows: parseResult.warningRows,
        exactDuplicates,
        highMatches,
        newRecords,
      },
      sampleRows: duplicateMatches.slice(0, 50).map((m) => ({
        rowNumber: m.incomingRow.rowNumber,
        sectionIndex: m.incomingRow.sectionIndex,
        sectionTitle: m.incomingRow.sectionTitle,
        name: m.incomingRow.name,
        phoneRaw: m.incomingRow.phoneRaw,
        phones: m.incomingRow.normalizedPhones,
        city: m.incomingRow.city,
        state: m.incomingRow.state,
        areaMarket: m.incomingRow.areaMarket,
        address: m.incomingRow.address,
        categories: m.incomingRow.categories,
        matchReason: m.matchReason,
        matchDescription: m.matchDescription,
        existingVendorName: m.existingVendorName,
        existingVendorLocation: m.existingVendorLocation,
        existingVendorPhone: m.existingVendorPhone,
        suggestedAction: m.suggestedAction,
      })),
    });
  } catch (error) {
    console.error('POST /api/vendors/import/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process spreadsheet file' },
      { status: 500 }
    );
  }
}
