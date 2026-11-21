import * as XLSX from 'xlsx';
import {
  generateStandardSampleWorkbook,
  generateStandardSampleCsv,
  generateMultiSectionSampleWorkbook,
} from '../src/lib/vendors/sampleTemplates';
import { parseVendorSpreadsheet } from '../src/lib/vendors/excelParser';

async function testSampleTemplates() {
  console.log('Testing sample templates generation and parsing...');

  // 1. Standard Excel Sample
  const stdWb = generateStandardSampleWorkbook();
  const stdBuf = XLSX.write(stdWb, { type: 'buffer', bookType: 'xlsx' });
  const stdParsed = parseVendorSpreadsheet(stdBuf, 'sample.xlsx');
  console.log('Standard parsed layout:', stdParsed.detectedLayout, 'rows:', stdParsed.rows.length);
  if (stdParsed.rows.length !== 6) throw new Error(`Expected 6 rows in standard sample, got ${stdParsed.rows.length}`);
  console.log('  ✅ Standard Excel template generated and parsed 6 vendors');

  // 2. Multi-Section Excel Sample
  const multiWb = generateMultiSectionSampleWorkbook();
  const multiBuf = XLSX.write(multiWb, { type: 'buffer', bookType: 'xlsx' });
  const multiParsed = parseVendorSpreadsheet(multiBuf, 'multicity.xlsx');
  console.log('Multi-section parsed layout:', multiParsed.detectedLayout, 'sections:', multiParsed.sections.length, 'rows:', multiParsed.rows.length);
  if (multiParsed.detectedLayout !== 'HORIZONTAL_MULTI_SECTION') {
    throw new Error(`Expected HORIZONTAL_MULTI_SECTION layout, got ${multiParsed.detectedLayout}`);
  }
  if (multiParsed.sections.length !== 3) {
    throw new Error(`Expected 3 sections in multi-section sample, got ${multiParsed.sections.length}`);
  }
  console.log('  ✅ Multi-section Excel template generated and detected 3 horizontal city sections');

  // 3. Standard CSV Sample
  const csv = generateStandardSampleCsv();
  console.log('CSV length:', csv.length, 'lines:', csv.trim().split('\n').length);
  const csvBuf = Buffer.from(csv, 'utf-8');
  const csvParsed = parseVendorSpreadsheet(csvBuf, 'sample.csv');
  console.log('CSV parsed rows:', csvParsed.rows.length);
  if (csvParsed.rows.length !== 6) throw new Error(`Expected 6 rows in CSV sample, got ${csvParsed.rows.length}`);
  console.log('  ✅ CSV template generated and parsed 6 vendors');

  console.log('🎉 All sample template generation and parsing tests PASSED successfully!');
}

testSampleTemplates().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
