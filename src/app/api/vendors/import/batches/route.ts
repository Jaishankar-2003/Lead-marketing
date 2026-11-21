import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await prisma.vendorImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        sheetNames: true,
        selectedSheet: true,
        mode: true,
        status: true,
        totalRecords: true,
        importedCount: true,
        updatedCount: true,
        skippedCount: true,
        duplicateCount: true,
        invalidCount: true,
        reviewCount: true,
        createdAt: true,
        committedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      batches,
    });
  } catch (error) {
    console.error('GET /api/vendors/import/batches error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch import batches' },
      { status: 500 }
    );
  }
}
