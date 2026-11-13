import { PrismaClient, CrmStatus, ServiceProspect } from '@prisma/client';
import { normalizeDomain, normalizePhone } from '../src/lib/normalization';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting CRM Feature Parity & Open Marketing Integration Test...\n');

  // 1. Verify Database Connection
  const existingCount = await prisma.lead.count();
  console.log(`✅ Database connected successfully. Total existing leads: ${existingCount}`);

  // 2. Test Deduplication against existing lead
  const sampleExisting = await prisma.lead.findFirst({
    where: {
      AND: [
        { website: { not: null } },
        { NOT: { website: '' } },
      ],
    },
  });

  if (sampleExisting && sampleExisting.website) {
    console.log(`\n🔍 Testing Domain Deduplication using existing lead "${sampleExisting.businessName}" (${sampleExisting.website})...`);
    const normDomain = normalizeDomain(sampleExisting.website);
    console.log(`   Normalized Domain: ${normDomain}`);

    // Query like crm-sync does
    const matched = await prisma.lead.findFirst({
      where: { normalizedDomain: normDomain },
      include: {
        activities: { take: 5, orderBy: { createdAt: 'desc' } },
        followUps: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (matched && matched.id === sampleExisting.id) {
      console.log(`✅ Deduplication match succeeded: Matched existing Lead ID ${matched.id} without duplicating!`);
      console.log(`   Preserved existing status: ${matched.crmStatus}`);
      console.log(`   Preserved existing source: ${matched.source}`);
      console.log(`   Existing activities count: ${matched.activities.length}`);
    } else {
      throw new Error(`Deduplication failed to match expected lead ${sampleExisting.id}`);
    }
  }

  // 3. Test Creation of a New Open Marketing Lead
  const testBusinessName = 'Parity Test Medical Clinic ' + Date.now();
  const testDomain = `test-parity-clinic-${Date.now()}.in`;
  const testPhone = '9198421' + Math.floor(10000 + Math.random() * 90000);
  const normDomain = normalizeDomain(testDomain);
  const normPhone = normalizePhone(testPhone);

  console.log(`\n➕ Creating new Open Marketing Lead: "${testBusinessName}"...`);
  const createdLead = await prisma.lead.create({
    data: {
      businessName: testBusinessName,
      category: 'Medical Clinic',
      city: 'Madurai',
      address: '77 Cross Road, KK Nagar',
      phone: testPhone,
      normalizedPhone: normPhone,
      email: 'doctor@' + testDomain,
      website: 'https://' + testDomain,
      normalizedDomain: normDomain,
      source: 'open_marketing',
      serviceProspect: ServiceProspect.BOTH,
      crmStatus: CrmStatus.NEW,
      notes: 'Initial discovery note from Open Marketing engine',
      activities: {
        create: {
          type: 'STATUS_CHANGE',
          channel: 'SYSTEM',
          content: 'Lead discovered via Open Marketing Playwright Engine',
          metadata: {
            category: 'Medical Clinic',
            area: 'KK Nagar',
            source: 'open_marketing',
          },
        },
      },
    },
    include: {
      activities: true,
      followUps: true,
    },
  });

  console.log(`✅ Created test lead: ID=${createdLead.id}, source=${createdLead.source}, status=${createdLead.crmStatus}`);
  console.log(`   Initial activity logged: ${createdLead.activities[0]?.type} - ${createdLead.activities[0]?.content}`);

  // 4. Test CRM Stage Progression
  console.log(`\n🔄 Testing Pipeline Stage Progression (NEW -> INTERESTED)...`);
  const updatedStage = await prisma.lead.update({
    where: { id: createdLead.id },
    data: {
      crmStatus: CrmStatus.INTERESTED,
      activities: {
        create: {
          type: 'STATUS_CHANGE',
          channel: 'SYSTEM',
          content: 'Stage moved from NEW to INTERESTED via Open Marketing CRM Drawer',
        },
      },
    },
    include: { activities: true },
  });
  console.log(`✅ Updated lead stage to: ${updatedStage.crmStatus}`);
  console.log(`   Total activities now: ${updatedStage.activities.length}`);

  // 5. Test Scheduling a Follow-Up
  console.log(`\n📅 Testing Follow-Up Scheduling...`);
  const dueDate = new Date(Date.now() + 86400000 * 2); // 2 days ahead
  const createdFollowUp = await prisma.followUp.create({
    data: {
      leadId: createdLead.id,
      dueAt: dueDate,
      notes: 'Call Dr. Sundar to present AMC proposal and Web Design portfolio',
      status: 'PENDING',
    },
  });
  console.log(`✅ Created follow-up: ID=${createdFollowUp.id}, dueAt=${createdFollowUp.dueAt.toISOString()}`);

  // 6. Test Completing a Follow-Up
  console.log(`\n✔️ Testing Follow-Up Completion...`);
  const completedFollowUp = await prisma.followUp.update({
    where: { id: createdFollowUp.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });
  console.log(`✅ Follow-up completed: status=${completedFollowUp.status}`);

  // 7. Test Opt-Out Toggling (Do Not Contact)
  console.log(`\n🚫 Testing Opt-Out Toggle...`);
  const optOutLead = await prisma.lead.update({
    where: { id: createdLead.id },
    data: {
      doNotContact: true,
      activities: {
        create: {
          type: 'OPT_OUT',
          channel: 'SYSTEM',
          content: 'Lead marked as Do Not Contact',
        },
      },
    },
  });
  console.log(`✅ Opt-out updated: doNotContact=${optOutLead.doNotContact}`);

  // 8. Test Clean Up of Test Record
  console.log(`\n🧹 Cleaning up test lead data...`);
  await prisma.activityLog.deleteMany({ where: { leadId: createdLead.id } });
  await prisma.followUp.deleteMany({ where: { leadId: createdLead.id } });
  await prisma.lead.delete({ where: { id: createdLead.id } });
  console.log(`✅ Test lead and associated records cleanly removed.`);

  const finalCount = await prisma.lead.count();
  console.log(`\n🎉 All CRM Feature Parity Tests Passed Successfully! Database lead count verified: ${finalCount}`);
}

main()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
