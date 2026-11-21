import { seedVendorDefaults } from '../src/lib/vendors/vendorSeed';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding initial vendor locations, categories, and enquiry templates...');
  await seedVendorDefaults();
  console.log('Vendor defaults seeded successfully!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error during vendor seeding:', err);
  process.exit(1);
});
