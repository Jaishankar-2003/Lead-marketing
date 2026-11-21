import { prisma } from '../prisma';

export async function seedVendorDefaults() {
  // Helper for normalizing location names
  const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // 1. States
  const states = [
    { name: 'Tamil Nadu', aliases: ['TN'] },
    { name: 'Karnataka', aliases: ['KA'] },
    { name: 'Delhi', aliases: ['DL', 'Delhi NCR', 'New Delhi'] },
    { name: 'Maharashtra', aliases: ['MH'] },
    { name: 'Telangana', aliases: ['TS', 'TG'] },
  ];

  const stateMap: Record<string, string> = {};

  for (const s of states) {
    const normalizedName = norm(s.name);
    let loc = await prisma.vendorLocation.findFirst({
      where: { normalizedName, level: 'STATE' },
    });
    if (!loc) {
      loc = await prisma.vendorLocation.create({
        data: {
          name: s.name,
          normalizedName,
          level: 'STATE',
          country: 'India',
          aliases: s.aliases,
        },
      });
    }
    stateMap[s.name] = loc.id;
  }

  // 2. Cities
  const cities = [
    // Tamil Nadu
    { name: 'Madurai', state: 'Tamil Nadu', aliases: ['MDU'] },
    { name: 'Coimbatore', state: 'Tamil Nadu', aliases: ['CBE', 'Kovai'] },
    { name: 'Chennai', state: 'Tamil Nadu', aliases: ['Madras'] },
    { name: 'Tiruppur', state: 'Tamil Nadu', aliases: ['Tirupur'] },
    { name: 'Salem', state: 'Tamil Nadu', aliases: [] },
    { name: 'Tiruchirappalli', state: 'Tamil Nadu', aliases: ['Trichy'] },
    // Karnataka
    { name: 'Bangalore', state: 'Karnataka', aliases: ['Bengaluru', 'BLR'] },
    // Delhi
    { name: 'Delhi', state: 'Delhi', aliases: ['New Delhi', 'NCR'] },
    // Maharashtra
    { name: 'Mumbai', state: 'Maharashtra', aliases: ['Bombay'] },
    { name: 'Pune', state: 'Maharashtra', aliases: [] },
    // Telangana
    { name: 'Hyderabad', state: 'Telangana', aliases: ['Secunderabad', 'HYD'] },
  ];

  const cityMap: Record<string, string> = {};

  for (const c of cities) {
    const parentId = stateMap[c.state];
    if (!parentId) continue;
    const normalizedName = norm(c.name);

    let loc = await prisma.vendorLocation.findFirst({
      where: { normalizedName, level: 'CITY' },
    });
    if (!loc) {
      loc = await prisma.vendorLocation.create({
        data: {
          name: c.name,
          normalizedName,
          level: 'CITY',
          country: 'India',
          aliases: c.aliases,
          parentId,
        },
      });
    }
    cityMap[c.name] = loc.id;
  }

  // 3. Commercial Markets & Key Areas
  const markets = [
    // Madurai
    { name: 'Goripalayam', city: 'Madurai', level: 'MARKET', aliases: ['Goripalayam Market'] },
    { name: 'Simmakkal', city: 'Madurai', level: 'MARKET', aliases: ['Simmakkal Market'] },
    { name: 'Town Hall Road', city: 'Madurai', level: 'MARKET', aliases: ['Town Hall Rd'] },
    { name: 'Anna Nagar', city: 'Madurai', level: 'AREA', aliases: [] },
    // Coimbatore
    { name: 'Gandhipuram', city: 'Coimbatore', level: 'MARKET', aliases: ['Gandhipuram Market', 'Cross Cut'] },
    { name: 'RS Puram', city: 'Coimbatore', level: 'AREA', aliases: ['R.S. Puram'] },
    // Chennai
    { name: 'Ritchie Street', city: 'Chennai', level: 'MARKET', aliases: ['Mount Road', 'Ritchie St', 'Narasingapuram'] },
    { name: 'T Nagar', city: 'Chennai', level: 'AREA', aliases: ['T. Nagar'] },
    // Bangalore
    { name: 'SP Road', city: 'Bangalore', level: 'MARKET', aliases: ['S.P. Road', 'Sadarth Patrappa Road'] },
    { name: 'Koramangala', city: 'Bangalore', level: 'AREA', aliases: [] },
    // Delhi
    { name: 'Nehru Place', city: 'Delhi', level: 'MARKET', aliases: ['Nehru Place Market'] },
    { name: 'Wazirpur', city: 'Delhi', level: 'MARKET', aliases: ['Wazirpur Computer Market'] },
    // Mumbai
    { name: 'Lamington Road', city: 'Mumbai', level: 'MARKET', aliases: ['Grant Road', 'Lamington Rd'] },
    // Hyderabad
    { name: 'CTC Parklane', city: 'Hyderabad', level: 'MARKET', aliases: ['Chenoy Trade Center', 'Parklane Secunderabad'] },
  ];

  for (const m of markets) {
    const parentId = cityMap[m.city];
    if (!parentId) continue;
    const normalizedName = norm(m.name);

    const existing = await prisma.vendorLocation.findFirst({
      where: { normalizedName, parentId },
    });
    if (!existing) {
      await prisma.vendorLocation.create({
        data: {
          name: m.name,
          normalizedName,
          level: m.level,
          country: 'India',
          aliases: m.aliases,
          parentId,
        },
      });
    }
  }

  // 4. Hardware Component Categories
  const categories = [
    { name: 'RAM / Memory (DDR4 / DDR5)', kind: 'CATEGORY', sortOrder: 1 },
    { name: 'Storage (NVMe SSD / SATA SSD / HDD)', kind: 'CATEGORY', sortOrder: 2 },
    { name: 'Graphics Cards (GPU)', kind: 'CATEGORY', sortOrder: 3 },
    { name: 'Processors (CPU)', kind: 'CATEGORY', sortOrder: 4 },
    { name: 'Motherboards', kind: 'CATEGORY', sortOrder: 5 },
    { name: 'Power Supply (SMPS / PSU)', kind: 'CATEGORY', sortOrder: 6 },
    { name: 'PC Cabinets & Cases', kind: 'CATEGORY', sortOrder: 7 },
    { name: 'Cooling Systems & Fans', kind: 'CATEGORY', sortOrder: 8 },
    { name: 'Monitors & Displays', kind: 'CATEGORY', sortOrder: 9 },
    { name: 'Keyboards & Mice / Peripherals', kind: 'CATEGORY', sortOrder: 10 },
    { name: 'Laptop Spares (Screen, Battery, Keyboard)', kind: 'CATEGORY', sortOrder: 11 },
    { name: 'Networking & Cables', kind: 'CATEGORY', sortOrder: 12 },
    { name: 'Pre-built Desktops & Assembled PCs', kind: 'CATEGORY', sortOrder: 13 },
    { name: 'Refurbished & Second Hand Parts', kind: 'CATEGORY', sortOrder: 14 },
    { name: 'Printers, Toners & Inks', kind: 'CATEGORY', sortOrder: 15 },
    { name: 'CCTV & Surveillance Hardware', kind: 'CATEGORY', sortOrder: 16 },
  ];

  for (const cat of categories) {
    const existing = await prisma.vendorCategory.findFirst({
      where: { name: cat.name },
    });
    if (!existing) {
      await prisma.vendorCategory.create({
        data: {
          name: cat.name,
          kind: cat.kind,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
    }
  }

  // 5. Default Message Templates
  const templates = [
    {
      name: 'Component Availability & Price Check (English)',
      channel: 'WHATSAPP',
      enquiryType: 'PRICE_AND_STOCK',
      subject: 'Inquiry for PC Hardware Component Availability & Pricing',
      body: `Hello {{vendor_name}},

We have an urgent requirement for a client in {{customer_location}}.
Could you please share availability and best price for:

{{component_list}}

Please confirm:
1. Stock availability (Ready Stock / In Transit)
2. Best price (with / without GST)
3. Brand & Warranty details

Looking forward to your quick response.
Thank you!`,
      isDefault: true,
    },
    {
      name: 'Quick Price & Stock Check (Tamil / English)',
      channel: 'WHATSAPP',
      enquiryType: 'PRICE_AND_STOCK',
      subject: 'Component Stock Requirement',
      body: `Vanakkam {{vendor_name}},

Namakku urgent component thevaipadugiradhu for customer in {{customer_location}}:

{{component_list}}

Intha item ungalidam stock irukka? Best price and warranty solla mudiyuma?

Thank you!`,
      isDefault: false,
    },
    {
      name: 'Formal Email Component Request (With GST / Quotation)',
      channel: 'EMAIL',
      enquiryType: 'FORMAL_QUOTATION',
      subject: 'Quotation Request: PC Hardware Components - {{enquiry_code}}',
      body: `Dear {{vendor_name}} Team,

Greetings.

We request your official quotation for the following computer hardware components required for our client:

Requirement Details:
{{component_list}}

Required Location / Delivery: {{customer_location}}
Urgency: {{urgency}}

Kindly reply with:
- Unit Price & Applicable GST %
- Stock status & Warranty
- Estimated dispatch / collection time

Thank you for your prompt assistance.

Best regards,
Procurement & Lead Management Team`,
      isDefault: true,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.vendorMessageTemplate.findFirst({
      where: { name: t.name, channel: t.channel },
    });
    if (!existing) {
      await prisma.vendorMessageTemplate.create({
        data: {
          name: t.name,
          channel: t.channel,
          enquiryType: t.enquiryType,
          subject: t.subject,
          body: t.body,
          isDefault: t.isDefault,
          isActive: true,
        },
      });
    }
  }
}
