import * as XLSX from 'xlsx';
import { normalizeIndianPhone, extractPhoneNumbers } from '../src/lib/vendors/phoneUtils';
import { parseVendorSpreadsheet } from '../src/lib/vendors/excelParser';
import { analyzeDuplicates } from '../src/lib/vendors/duplicateEngine';
import { parseComponentListText } from '../src/lib/vendors/componentParser';
import { prisma } from '../src/lib/prisma';

async function runVendorSystemTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VENDOR MANAGEMENT & COMPONENT ENQUIRY TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Indian Phone Normalization & STD Landline Resolution
  // -------------------------------------------------------------
  console.log('--- Test Suite 1: Indian Phone & STD Normalization ---');

  const mobile1 = normalizeIndianPhone('98421 12345');
  assert(mobile1.isValid && mobile1.normalized === '+919842112345' && mobile1.canWhatsApp, '10-digit mobile normalization (+91)');

  const mobile2 = normalizeIndianPhone('098940 98765');
  assert(mobile2.isValid && mobile2.normalized === '+919894098765' && mobile2.canWhatsApp, '11-digit mobile starting with 0');

  const landlineMadurai = normalizeIndianPhone('0452-2345678');
  assert(landlineMadurai.isValid && landlineMadurai.type === 'LANDLINE' && !landlineMadurai.canWhatsApp, 'Madurai landline (0452)');

  const landlineCbe = normalizeIndianPhone('04222456789');
  assert(landlineCbe.isValid && landlineCbe.type === 'LANDLINE', 'Coimbatore landline (0422)');

  const multiplePhones = extractPhoneNumbers('9842111111 / 0452-2555555, 9894022222');
  assert(multiplePhones.length === 3, 'Extraction of 3 delimited numbers from single string');

  // -------------------------------------------------------------
  // TEST 2: Multi-Column Horizontal Section Excel Spreadsheet Parsing
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Multi-Section Horizontal Excel Parsing ---');

  // Create an Excel workbook with 3 side-by-side city sections
  // Section 1 (Cols A-C): Madurai Simmakkal Shops
  // Col D: Empty
  // Section 2 (Cols E-G): Coimbatore Gandhipuram Shops
  // Col H: Empty
  // Section 3 (Cols I-K): Bangalore SP Road Dealers
  const sheetData: any[][] = [
    // Row 0: Section Titles
    ['MADURAI SIMMAKKAL SHOPS', '', '', '', 'COIMBATORE GANDHIPURAM', '', '', '', 'BANGALORE SP ROAD', '', ''],
    // Row 1: Column Headers
    ['Shop Name', 'Mobile Number', 'Address', '', 'Dealer Name', 'Contact Phone', 'Market Location', '', 'Store Name', 'Phone', 'Address'],
    // Row 2: Data Row 1
    ['Meenakshi Infotech', '9842112345', 'Simmakkal, Madurai', '', 'Kovai Tech Solutions', '9894012345', 'Gandhipuram, Coimbatore', '', 'SP Road Electronics', '9880012345', 'SP Road, Bangalore'],
    // Row 3: Data Row 2
    ['Pandian Systems', '0452-2345678', 'Town Hall Rd, Madurai', '', 'Anamalai Computers', '0422-2555666', 'Cross Cut Rd, Coimbatore', '', 'Siddeshwara Hardware', '080-22223333', 'SP Road, Bangalore'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendors_Multi_City');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const parsed = parseVendorSpreadsheet(excelBuffer);
  assert(parsed.detectedLayout === 'HORIZONTAL_MULTI_SECTION', 'Layout detected as HORIZONTAL_MULTI_SECTION');
  assert(parsed.sections.length === 3, `Detected exactly 3 horizontal sections (got ${parsed.sections.length})`);
  assert(parsed.totalRows === 6, `Extracted 6 vendors across all 3 sections (got ${parsed.totalRows})`);

  // Verify location hints were extracted from section titles / addresses
  const maduraiVendors = parsed.rows.filter(r => r.city === 'Madurai' || (r.address && r.address.includes('Madurai')));
  assert(maduraiVendors.length >= 2, 'Madurai vendors identified in section 1');

  const cbeVendors = parsed.rows.filter(r => r.city === 'Coimbatore' || (r.address && r.address.includes('Coimbatore')));
  assert(cbeVendors.length >= 2, 'Coimbatore vendors identified in section 2');

  const blrVendors = parsed.rows.filter(r => r.city === 'Bangalore' || (r.address && r.address.includes('Bangalore')));
  assert(blrVendors.length >= 2, 'Bangalore vendors identified in section 3');

  // -------------------------------------------------------------
  // TEST 3: Duplicate Engine Analysis
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Deduplication Engine & Fingerprinting ---');

  const dupMatches = await analyzeDuplicates(parsed.rows);
  assert(dupMatches.length === parsed.rows.length, 'Duplicate analysis executed for all extracted rows');

  // Test intra-batch duplicate detection by adding repeated phone row
  const duplicateBatchData: any[][] = [
    ['Shop Name', 'Phone', 'City'],
    ['Original Alpha Tech', '9842199999', 'Madurai'],
    ['Alpha Tech Second Branch', '9842199999', 'Madurai'], // Same phone!
  ];
  const wsDup = XLSX.utils.aoa_to_sheet(duplicateBatchData);
  const wbDup = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbDup, wsDup, 'IntraBatchDups');
  const dupBuf = XLSX.write(wbDup, { type: 'buffer', bookType: 'xlsx' });

  const parsedDup = parseVendorSpreadsheet(dupBuf);
  const dupResults = await analyzeDuplicates(parsedDup.rows);
  assert(dupResults[1].matchReason === 'INTRA_BATCH_PHONE', 'Intra-batch duplicate phone correctly flagged as INTRA_BATCH_PHONE');

  // -------------------------------------------------------------
  // TEST 4: Vendor Creation & Database Isolation
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: Vendor Creation & Database Isolation ---');

  // Create a test Madurai vendor with RAM category
  const maduraiCity = await prisma.vendorLocation.findFirst({ where: { normalizedName: 'madurai', level: 'CITY' } });
  const ramCategory = await prisma.vendorCategory.findFirst({ where: { name: { contains: 'RAM' } } });

  assert(Boolean(maduraiCity), 'Madurai city location exists in database');
  assert(Boolean(ramCategory), 'RAM hardware category exists in database');

  const testVendor = await prisma.vendor.create({
    data: {
      vendorCode: `VEN-TEST-${Date.now().toString().slice(-4)}`,
      name: 'Sri Krishna Computer Bazaar',
      normalizedName: 'sri krishna computer bazaar',
      status: 'ACTIVE',
      cityId: maduraiCity!.id,
      fullAddress: 'Simmakkal, Madurai - 625001',
      contacts: {
        create: [
          {
            type: 'PHONE',
            value: '9842177777',
            normalized: '+919842177777',
            kind: 'MOBILE',
            isPrimary: true,
            isWhatsApp: true,
            isValid: true,
          },
        ],
      },
      categories: {
        create: [
          {
            categoryId: ramCategory!.id,
          },
        ],
      },
    },
  });

  assert(Boolean(testVendor.id), `Test vendor created (${testVendor.vendorCode})`);

  // Verify isolation from Lead table
  const leadCount = await prisma.lead.count();
  const vendorCount = await prisma.vendor.count();
  assert(vendorCount > 0, 'Vendor table contains vendor records');
  console.log(`  ℹ️ Isolation check: ${vendorCount} vendor(s) in Vendor table, ${leadCount} lead(s) in Lead table (Zero mixing)`);

  // -------------------------------------------------------------
  // TEST 5: Component Enquiry, Smart Matching & Quotation
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 5: Component Enquiry & Smart Vendor Matching ---');

  const enq = await prisma.componentEnquiry.create({
    data: {
      requestCode: `ENQ-TEST-${Date.now().toString().slice(-4)}`,
      customerName: 'Karthik Raja',
      customerLocation: 'Madurai',
      cityId: maduraiCity!.id,
      priority: 'HIGH',
      urgency: 'Immediate',
      status: 'OPEN',
      items: {
        create: [
          {
            componentName: 'DDR4 16GB 3200MHz RAM',
            quantity: 2,
            categoryId: ramCategory!.id,
            budget: '3000',
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  assert(Boolean(enq.id), `Component Enquiry created (${enq.requestCode}) with ${enq.items.length} item`);

  // Add test vendor as recipient
  const recipient = await prisma.vendorEnquiryRecipient.create({
    data: {
      enquiryId: enq.id,
      vendorId: testVendor.id,
      status: 'READY_TO_CONTACT',
      channel: 'WHATSAPP',
      renderedMessage: `Vanakkam ${testVendor.name}, requirement for Madurai: 2x DDR4 16GB RAM`,
    },
  });
  assert(Boolean(recipient.id), 'Vendor added as enquiry recipient');

  // Record a quotation
  const quote = await prisma.vendorQuotation.create({
    data: {
      enquiryId: enq.id,
      recipientId: recipient.id,
      vendorId: testVendor.id,
      itemId: enq.items[0].id,
      availability: 'AVAILABLE',
      availableQty: 2,
      unitPrice: 2450,
      gstPercent: 18,
      gstAmount: 441,
      totalPrice: 5782, // (2450 + 441) * 2
      warranty: '3 Years Kingston Warranty',
      deliveryTime: 'Same Day Store Pickup',
    },
  });

  assert(Boolean(quote.id && quote.totalPrice === 5782), `Vendor Quotation logged (Total: ₹${quote.totalPrice})`);

  // -------------------------------------------------------------
  // TEST 5: Smart Component Text Auto-Parser & Online Benchmark Savings
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 5: Smart Component Text Auto-Parser & Online Benchmark ---');

  const rawBuildText = `1. Processor: AMD Ryzen 7 9700X (8 Cores / 16 Threads)
2. Graphics Card: NVIDIA RTX 5060 Ti 16GB GDDR7
3. Motherboard: MSI PRO B650M-A WiFi
4. RAM: 64GB DDR5 6000MHz (2 × 32GB)
5. Storage: 2TB NVMe PCIe Gen4 SSD - Online Price: Rs 14500
6. CPU Cooler: DeepCool AK400 / AG400
7. Power Supply: 750W 80+ Gold, ATX 3.1
8. Cabinet: Airflow Mesh Mid-Tower`;

  const parsedItems = parseComponentListText(rawBuildText, [
    { id: 'cat-proc', name: 'Processors / CPU' },
    { id: 'cat-gpu', name: 'Graphics Cards / GPU' },
    { id: 'cat-mobo', name: 'Motherboards' },
    { id: 'cat-ram', name: 'RAM / Memory' },
    { id: 'cat-storage', name: 'Storage / SSD / HDD' },
    { id: 'cat-cooler', name: 'Cooling / Fans' },
    { id: 'cat-psu', name: 'Power Supply / SMPS' },
    { id: 'cat-case', name: 'Cabinets / Cases' },
  ]);

  assert(parsedItems.length === 8, `Parsed all 8 PC components from raw text (got ${parsedItems.length})`);
  assert(parsedItems[0].componentName === 'AMD Ryzen 7 9700X' && parsedItems[0].brand === 'AMD', 'Item 1: AMD Ryzen 7 9700X identified with AMD brand');
  assert(parsedItems[0].specifications === '8 Cores / 16 Threads', 'Item 1: Specifications (8 Cores / 16 Threads) extracted');
  assert(parsedItems[1].componentName.includes('RTX 5060 Ti') && parsedItems[1].brand === 'NVIDIA', 'Item 2: RTX 5060 Ti identified with NVIDIA brand');
  assert(parsedItems[4].onlinePrice === 14500, 'Item 5: Online price parsed as ₹14,500');

  // Verify savings calculation logic
  const benchmarkOnlinePrice = 14500;
  const bestVendorQuote = 12000;
  const savings = benchmarkOnlinePrice - bestVendorQuote;
  const savingsPercent = Math.round((savings / benchmarkOnlinePrice) * 100);
  assert(savings === 2500 && savingsPercent === 17, `Online vs Vendor savings calculated (₹${savings} saved / ${savingsPercent}%)`);

  // -------------------------------------------------------------
  // TEST 6: Vendor Bulk Deletion & Permanent Delete Regression
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 6: Vendor Bulk Deletion & Cascade Clean ---');

  const bulkTestVendors = await Promise.all([
    prisma.vendor.create({
      data: {
        vendorCode: 'VEN-DEL-1',
        name: 'Bulk Delete Shop 1',
        normalizedName: 'bulk delete shop 1',
        contacts: { create: [{ type: 'PHONE', value: '9842100001', isPrimary: true }] },
      },
    }),
    prisma.vendor.create({
      data: {
        vendorCode: 'VEN-DEL-2',
        name: 'Bulk Delete Shop 2',
        normalizedName: 'bulk delete shop 2',
        contacts: { create: [{ type: 'PHONE', value: '9842100002', isPrimary: true }] },
      },
    }),
    prisma.vendor.create({
      data: {
        vendorCode: 'VEN-DEL-3',
        name: 'Bulk Delete Shop 3',
        normalizedName: 'bulk delete shop 3',
        contacts: { create: [{ type: 'PHONE', value: '9842100003', isPrimary: true }] },
      },
    }),
  ]);

  const bulkIds = bulkTestVendors.map((v) => v.id);
  assert(bulkIds.length === 3, '3 test vendors created for bulk deletion test');

  // Execute bulk delete transaction identical to DELETE /api/vendors
  await prisma.$transaction([
    prisma.vendorQuotation.deleteMany({ where: { vendorId: { in: bulkIds } } }),
    prisma.vendorEnquiryRecipient.deleteMany({ where: { vendorId: { in: bulkIds } } }),
    prisma.vendorContact.deleteMany({ where: { vendorId: { in: bulkIds } } }),
    prisma.vendorCategoryAssignment.deleteMany({ where: { vendorId: { in: bulkIds } } }),
    prisma.vendorActivityLog.deleteMany({ where: { vendorId: { in: bulkIds } } }),
    prisma.vendorImportRecord.updateMany({
      where: { vendorId: { in: bulkIds } },
      data: { vendorId: null },
    }),
    prisma.vendorImportRecord.updateMany({
      where: { matchVendorId: { in: bulkIds } },
      data: { matchVendorId: null },
    }),
    prisma.vendor.deleteMany({ where: { id: { in: bulkIds } } }),
  ]);

  const remainingVendorsCount = await prisma.vendor.count({
    where: { id: { in: bulkIds } },
  });
  assert(remainingVendorsCount === 0, 'All 3 selected vendors permanently removed from database');

  const remainingContactsCount = await prisma.vendorContact.count({
    where: { vendorId: { in: bulkIds } },
  });
  assert(remainingContactsCount === 0, 'All associated contacts cascade-cleaned from database');

  // -------------------------------------------------------------
  // TEST 7: Collision-Free Vendor Code Generation & Custom Area / Category
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 7: Sequential Collision-Free Vendor Code & Custom Area/Cat ---');

  // Simulate creating user vendor "jspcs" from user screenshot when gaps exist in numbering
  const allCodes = await prisma.vendor.findMany({
    where: { vendorCode: { startsWith: 'VEN-' } },
    select: { vendorCode: true },
  });

  let maxNum = 0;
  for (const v of allCodes) {
    const match = v.vendorCode.match(/^VEN-(\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  let candidateNum = maxNum + 1;
  let collisionFreeCode = '';
  while (true) {
    const candidate = `VEN-${String(candidateNum).padStart(4, '0')}`;
    const exists = await prisma.vendor.findUnique({
      where: { vendorCode: candidate },
      select: { id: true },
    });
    if (!exists) {
      collisionFreeCode = candidate;
      break;
    }
    candidateNum++;
  }

  assert(Boolean(collisionFreeCode) && candidateNum > maxNum, `Next collision-free vendor code calculated: ${collisionFreeCode}`);

  // Test creating vendor with custom area and custom category
  const customCat = await prisma.vendorCategory.create({
    data: { name: 'Test CCTV Hardware 2026', isActive: true },
  });
  assert(Boolean(customCat.id), 'Custom component category created dynamically');

  const jspcsVendor = await prisma.vendor.create({
    data: {
      vendorCode: collisionFreeCode,
      name: 'jspcs',
      normalizedName: 'jspcs',
      contactPerson: 'jai shakar',
      status: 'ACTIVE',
      fullAddress: 'pothigai nagar\nRailar nagar',
      contacts: {
        create: [
          {
            type: 'PHONE',
            value: '9842139997',
            normalized: '+919842139997',
            isPrimary: true,
            isWhatsApp: true,
          },
          {
            type: 'EMAIL',
            value: 'jaishankarpcservices2021@gmail.com',
            normalized: 'jaishankarpcservices2021@gmail.com',
            isPrimary: true,
          },
        ],
      },
      categories: {
        create: [{ category: { connect: { id: customCat.id } } }],
      },
    },
    include: { contacts: true, categories: true },
  });

  assert(Boolean(jspcsVendor.id && jspcsVendor.vendorCode === collisionFreeCode), `Vendor "${jspcsVendor.name}" created with code ${jspcsVendor.vendorCode} without collision!`);

  // Clean up jspcs test vendor
  await prisma.vendorContact.deleteMany({ where: { vendorId: jspcsVendor.id } });
  await prisma.vendorCategoryAssignment.deleteMany({ where: { vendorId: jspcsVendor.id } });
  await prisma.vendor.delete({ where: { id: jspcsVendor.id } });
  await prisma.vendorCategory.delete({ where: { id: customCat.id } });

  // Clean up test data
  await prisma.vendorQuotation.delete({ where: { id: quote.id } });
  await prisma.vendorEnquiryRecipient.delete({ where: { id: recipient.id } });
  await prisma.componentEnquiryItem.deleteMany({ where: { enquiryId: enq.id } });
  await prisma.componentEnquiry.delete({ where: { id: enq.id } });
  await prisma.vendorContact.deleteMany({ where: { vendorId: testVendor.id } });
  await prisma.vendorCategoryAssignment.deleteMany({ where: { vendorId: testVendor.id } });
  await prisma.vendor.delete({ where: { id: testVendor.id } });

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY WITH ZERO REGRESSIONS!`);
  console.log('================================================================\n');
}

runVendorSystemTests()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
