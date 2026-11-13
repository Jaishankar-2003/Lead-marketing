import { PrismaClient, CrmStatus, ServiceProspect } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample Madurai business leads...');

  const sampleLeads = [
    {
      businessName: 'Meenakshi Computers & Laptop Service',
      category: 'Computer Repair Service',
      phone: '04522345678',
      email: 'service@meenakshicomputers.com',
      website: null,
      address: '14 West Veli Street, Madurai',
      city: 'Madurai',
      state: 'Tamil Nadu',
      source: 'csv_import',
      crmStatus: CrmStatus.NEW,
      serviceProspect: ServiceProspect.BOTH,
      prospectReason: 'PC/IT category verified + No public website found in directory listing.',
      normalizedDomain: null,
      normalizedPhone: '04522345678',
      notes: 'Potential client for PC maintenance contract and new website design.',
    },
    {
      businessName: 'Pandian IT Support & Networking',
      category: 'IT Support Services',
      phone: '9842111222',
      email: 'contact@pandianit.in',
      website: 'https://pandianit.in',
      address: '88 Byepass Road, Madurai',
      city: 'Madurai',
      state: 'Tamil Nadu',
      source: 'csv_import',
      crmStatus: CrmStatus.RESEARCHED,
      serviceProspect: ServiceProspect.PC_SUPPORT,
      prospectReason: 'Business category explicitly matches PC / IT Support services.',
      normalizedDomain: 'pandianit.in',
      normalizedPhone: '9842111222',
      notes: 'Existing website verified. Need to follow up for backup server maintenance.',
    },
    {
      businessName: 'Madurai Handloom & Silk Textiles',
      category: 'Textile Retailer',
      phone: '9842133444',
      email: 'sales@maduraisilks.com',
      website: null,
      address: '42 South Masi Street, Madurai',
      city: 'Madurai',
      state: 'Tamil Nadu',
      source: 'csv_import',
      crmStatus: CrmStatus.CONTACTED,
      serviceProspect: ServiceProspect.WEBSITE_DEV,
      prospectReason: 'Established business listing with phone/location but no public website recorded.',
      normalizedDomain: null,
      normalizedPhone: '9842133444',
      notes: 'Spoke with store manager. Interested in an e-commerce catalog.',
    },
    {
      businessName: 'Vaigai Precision Machine Works',
      category: 'Manufacturing & Industrial',
      phone: '04522489000',
      email: 'info@vaigaiprecision.com',
      website: 'https://vaigaiprecision.com',
      address: 'Kappalur Industrial Estate, Madurai',
      city: 'Madurai',
      state: 'Tamil Nadu',
      source: 'csv_import',
      crmStatus: CrmStatus.INTERESTED,
      serviceProspect: ServiceProspect.GENERAL_BUSINESS,
      prospectReason: 'Business category verified with existing registered website.',
      normalizedDomain: 'vaigaiprecision.com',
      normalizedPhone: '04522489000',
      notes: 'Client expressed interest in annual IT support retainer.',
    },
    {
      businessName: 'Apex Computer Care & Data Recovery',
      category: 'PC Repair & Service',
      phone: '9842155666',
      email: null,
      website: null,
      address: 'KK Nagar East 5th Street, Madurai',
      city: 'Madurai',
      state: 'Tamil Nadu',
      source: 'manual',
      crmStatus: CrmStatus.NEW,
      serviceProspect: ServiceProspect.BOTH,
      prospectReason: 'PC/IT category verified + No public website found in directory listing.',
      normalizedDomain: null,
      normalizedPhone: '9842155666',
      notes: 'Walk-in referral lead.',
    },
  ];

  for (const lead of sampleLeads) {
    const existing = await prisma.lead.findFirst({
      where: {
        businessName: lead.businessName,
      },
    });

    if (!existing) {
      await prisma.lead.create({ data: lead });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
