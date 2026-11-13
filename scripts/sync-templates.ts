import { ensureDefaultTemplates } from '../src/outreach/template-defaults';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Synchronizing official email templates in database...');
  await ensureDefaultTemplates();

  const count = await prisma.emailTemplate.count();
  console.log(`Total Email Templates in database: ${count}`);

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, category: true, subject: true, isDefault: true, isHtml: true, body: true },
  });

  for (const [idx, tpl] of templates.entries()) {
    console.log(`\n[${idx + 1}] ${tpl.name} (${tpl.category})`);
    console.log(`    Subject: "${tpl.subject}"`);
    console.log(`    Default: ${tpl.isDefault} | HTML: ${tpl.isHtml}`);
    console.log(`    Contact 9842139997 included: ${tpl.body.includes('9842139997')}`);
    console.log(`    Jai Shankar sender included: ${tpl.body.includes('Jai Shankar')}`);
  }
}

main()
  .catch((e) => {
    console.error('Sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

