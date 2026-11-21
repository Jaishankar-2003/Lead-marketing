import * as XLSX from 'xlsx';

/**
 * Sample realistic computer hardware vendor data across Indian markets
 */
export const SAMPLE_STANDARD_VENDORS = [
  {
    'Shop / Business Name': 'Balaji Computers & Infotech',
    'Mobile / WhatsApp Number': '9842139997, 0452-2345678',
    'Contact Person': 'K. Balaji',
    'Email Address': 'balajipc.madurai@gmail.com',
    'City': 'Madurai',
    'Commercial Market / Area': 'Simmakkal',
    'Full Address': '45 North Veli Street, Near Simmakkal, Madurai - 625001',
    'Component Categories Supplied': 'RAM / Memory (DDR4 / DDR5), Storage (NVMe SSD / SATA SSD), Processors (CPU)',
    'GST Number': '33AAACB1234F1Z1',
    'Notes / Remarks': 'Wholesale rates for AMD Ryzen processors and Crucial DDR5 RAM'
  },
  {
    'Shop / Business Name': 'Supreme Technologies & Hardware',
    'Mobile / WhatsApp Number': '9840012345, 044-28521234',
    'Contact Person': 'Ramesh Kumar',
    'Email Address': 'sales@supremetech.in',
    'City': 'Chennai',
    'Commercial Market / Area': 'Ritchie Street',
    'Full Address': 'Shop 12, Meeran Sahib Street, Ritchie Street, Chennai - 600002',
    'Component Categories Supplied': 'Graphics Cards (GPU), Motherboards, Power Supply (SMPS / PSU)',
    'GST Number': '33AABCS5678M1Z8',
    'Notes / Remarks': 'Authorised sub-distributor for ASUS and Gigabyte motherboards & RTX GPUs'
  },
  {
    'Shop / Business Name': 'Delta Systems & Components',
    'Mobile / WhatsApp Number': '9842211223, 0422-2445566',
    'Contact Person': 'S. Shanmugam',
    'Email Address': 'deltacoimbatore@yahoo.com',
    'City': 'Coimbatore',
    'Commercial Market / Area': 'Gandhipuram',
    'Full Address': '114 7th Street, Gandhipuram, Coimbatore - 641012',
    'Component Categories Supplied': 'PC Cabinets & Cases, Cooling Systems & Fans, Monitors & Displays',
    'GST Number': '33AACCD9012L1Z4',
    'Notes / Remarks': 'DeepCool cabinets, liquid coolers, and Corsair power supplies in stock'
  },
  {
    'Shop / Business Name': 'Ankit Infotech (PC Studio)',
    'Mobile / WhatsApp Number': '9880198765, 080-22223344',
    'Contact Person': 'Ankit Jain',
    'Email Address': 'contact@pcstudio.in',
    'City': 'Bangalore',
    'Commercial Market / Area': 'SP Road',
    'Full Address': '88 Silver Jubilee Park Road, SP Road, Bangalore - 560002',
    'Component Categories Supplied': 'Processors (CPU), Graphics Cards (GPU), RAM / Memory (DDR4 / DDR5)',
    'GST Number': '29AABCA3456P1Z3',
    'Notes / Remarks': 'Specialist in custom liquid-cooled gaming rigs & SP Road distribution'
  },
  {
    'Shop / Business Name': 'Cost to Cost Technologies',
    'Mobile / WhatsApp Number': '9811122334, 011-26412345',
    'Contact Person': 'Rajesh Gupta',
    'Email Address': 'sales@costtocost.in',
    'City': 'Delhi',
    'Commercial Market / Area': 'Nehru Place',
    'Full Address': 'G-2, Shakuntala Building, Nehru Place, New Delhi - 110019',
    'Component Categories Supplied': 'Processors (CPU), Storage (NVMe SSD / SATA SSD), Pre-built Desktops',
    'GST Number': '07AAACC7890N1Z2',
    'Notes / Remarks': 'Bulk hardware pricing for Intel Core Ultra and Samsung 990 Pro SSDs'
  },
  {
    'Shop / Business Name': 'Challenger Hardware Hub',
    'Mobile / WhatsApp Number': '9443355667',
    'Contact Person': 'M. Karthik',
    'Email Address': 'challenger.chennai@gmail.com',
    'City': 'Chennai',
    'Commercial Market / Area': 'Mount Road',
    'Full Address': '22 Anna Salai, Near LIC, Chennai - 600002',
    'Component Categories Supplied': 'Keyboards & Mice / Peripherals, Networking & Cables, Laptop Spares',
    'GST Number': '33AABCC2345K1Z9',
    'Notes / Remarks': 'Genuine accessories, original laptop display panels, and adapters'
  }
];

/**
 * Generate standard single-table workbook
 */
export function generateStandardSampleWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(SAMPLE_STANDARD_VENDORS);

  // Set column widths for comfortable reading
  ws['!cols'] = [
    { wch: 32 }, // Shop Name
    { wch: 28 }, // Phone
    { wch: 18 }, // Contact Person
    { wch: 28 }, // Email
    { wch: 14 }, // City
    { wch: 22 }, // Area / Market
    { wch: 45 }, // Full Address
    { wch: 45 }, // Categories
    { wch: 18 }, // GST
    { wch: 45 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Hardware Vendors');
  return wb;
}

/**
 * Generate standard CSV string
 */
export function generateStandardSampleCsv(): string {
  const wb = generateStandardSampleWorkbook();
  const ws = wb.Sheets['Hardware Vendors'];
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Generate multi-city horizontal section workbook (Madurai, Coimbatore, Bangalore side-by-side)
 */
export function generateMultiSectionSampleWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Multi-section horizontal layout:
  // Cols A-C: Madurai | Col D: empty | Cols E-G: Coimbatore | Col H: empty | Cols I-K: Bangalore
  const rows = [
    // Section Title Row
    ['MADURAI - SIMMAKKAL', '', '', '', 'COIMBATORE - GANDHIPURAM', '', '', '', 'BANGALORE - SP ROAD', '', ''],
    // Section Header Row
    ['Shop Name', 'Phone Number', 'Area / Street', '', 'Shop Name', 'Phone Number', 'Area / Street', '', 'Shop Name', 'Phone Number', 'Area / Street'],
    // Data Rows
    [
      'Balaji Computers', '9842139997, 0452-2345678', 'North Veli St, Simmakkal',
      '',
      'Delta Systems', '9842211223, 0422-2445566', '7th Street, Gandhipuram',
      '',
      'Ankit Infotech (PC Studio)', '9880198765', 'SP Road, Silver Jubilee Park'
    ],
    [
      'Meenakshi Infotech', '9842100111', 'Town Hall Road',
      '',
      'Apex Computer World', '9443311222', 'Cross Cut Road',
      '',
      'Aashirwad Computers', '9845012345, 080-22271234', 'Sadath Mandir, SP Road'
    ],
    [
      'City Hardware Mart', '9789012345', 'Simmakkal Market',
      '',
      'Kovai Micro Systems', '9843055443', '100 Feet Road',
      '',
      'Supertron Infotech', '9886098765', 'Dharmaraja Koil St, SP Road'
    ],
    [
      'Shankar PC Spares', '9842139998', 'Railar Nagar, Madurai',
      '',
      'Coimbatore IT Mall', '9894012345', 'Gandhipuram 4th St',
      '',
      'Golchha Inter Trade', '9844023456, 080-22295678', 'SP Road, Bangalore'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 24 }, { wch: 24 }, { wch: 26 }, // Madurai
    { wch: 4 },                            // Spacer
    { wch: 24 }, { wch: 24 }, { wch: 26 }, // Coimbatore
    { wch: 4 },                            // Spacer
    { wch: 26 }, { wch: 24 }, { wch: 30 }  // Bangalore
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'City Wise Vendors');
  return wb;
}

/**
 * Triggers a browser-side file download for the requested sample format
 */
export function downloadSampleFile(format: 'xlsx' | 'csv' | 'multi-section') {
  if (typeof window === 'undefined') return;

  if (format === 'csv') {
    const csvContent = generateStandardSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-hardware-vendors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const wb = format === 'multi-section'
    ? generateMultiSectionSampleWorkbook()
    : generateStandardSampleWorkbook();

  const fileName = format === 'multi-section'
    ? 'sample-hardware-vendors-multicity.xlsx'
    : 'sample-hardware-vendors.xlsx';

  XLSX.writeFile(wb, fileName);
}
