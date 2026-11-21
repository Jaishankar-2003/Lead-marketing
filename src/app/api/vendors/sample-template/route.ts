import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  generateStandardSampleWorkbook,
  generateMultiSectionSampleWorkbook,
  generateStandardSampleCsv,
} from '@/lib/vendors/sampleTemplates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';

    if (format === 'csv') {
      const csv = generateStandardSampleCsv();
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sample-hardware-vendors.csv"',
        },
      });
    }

    const wb = format === 'multi-section'
      ? generateMultiSectionSampleWorkbook()
      : generateStandardSampleWorkbook();

    const fileName = format === 'multi-section'
      ? 'sample-hardware-vendors-multicity.xlsx'
      : 'sample-hardware-vendors.xlsx';

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error generating sample template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate sample template' },
      { status: 500 }
    );
  }
}
