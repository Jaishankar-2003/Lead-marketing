import { NextRequest, NextResponse } from 'next/server';
import { processCsvImport } from '@/lib/csv';

export async function POST(req: NextRequest) {
  try {
    let csvContent = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in form data' }, { status: 400 });
      }
      csvContent = await file.text();
    } else {
      const body = await req.json();
      csvContent = body.csv || '';
    }

    if (!csvContent || !csvContent.trim()) {
      return NextResponse.json({ success: false, error: 'CSV content is empty' }, { status: 400 });
    }

    const result = await processCsvImport(csvContent);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('Error importing CSV:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
