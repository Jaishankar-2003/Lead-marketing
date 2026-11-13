import minimist from 'minimist';
import { SearchInput } from './types';
import { discoverAndQualifyLeads } from './websiteDiscovery';

const args = minimist(process.argv.slice(2));

// Detect browser execution mode from CLI flags
let parsedMode: 'headless' | 'headed' | undefined = undefined;
if (args['headed'] === true || args['headless'] === false || args['browser-mode'] === 'headed' || args['browserMode'] === 'headed') {
  parsedMode = 'headed';
  process.env.HEADLESS = 'false';
  process.env.PW_HEADLESS = 'false';
} else if (args['headless'] === true || args['headed'] === false || args['browser-mode'] === 'headless' || args['browserMode'] === 'headless') {
  parsedMode = 'headless';
  process.env.HEADLESS = 'true';
  process.env.PW_HEADLESS = 'true';
}

const input: SearchInput = {
  category: (args['category'] as string) || (args['c'] as string) || 'Retail shops',
  area:     (args['area'] as string)     || (args['a'] as string) || 'Anna Nagar',
  city:     (args['city'] as string)     || (args['l'] as string) || 'Madurai',
  country:  (args['country'] as string)  || (args['n'] as string) || 'India',
  maxSubcategories: args['subcategories'] ? parseInt(args['subcategories'], 10) : 8,
  skipWebsiteAnalysis: Boolean(args['quick'] || args['skip-analysis']),
  browserMode: parsedMode,
  headless: parsedMode ? parsedMode === 'headless' : undefined,
};

discoverAndQualifyLeads(input)
  .then((leads) => {
    const qualified = leads.filter((l) => l.leadScores.qualificationStatus === 'QUALIFIED');

    console.log(`\n🏆 TOP QUALIFIED CUSTOMER LEADS PREVIEW:\n`);
    qualified.slice(0, 10).forEach((lead, index) => {
      console.log(`[${index + 1}] ${lead.businessName} (${lead.category})`);
      console.log(`    📍 Address      : ${lead.address}`);
      console.log(`    📌 Locality     : [${lead.locationStatus}] in ${lead.city}`);
      console.log(`    📞 Phone        : ${lead.phone || 'N/A'}`);
      console.log(`    🌐 Website      : ${lead.websiteUrl || 'None'} [Status: ${lead.websiteStatus}]`);
      console.log(`    📧 Email        : ${lead.email || 'N/A'}`);
      console.log(`    🔗 Sources      : ${lead.sources.join(', ')}`);
      console.log(`    💻 Web Dev Score: ${lead.leadScores.websiteDevScore}/100 [${lead.leadScores.websiteDevRating}]`);
      console.log(`    🔧 PC Repair    : ${lead.leadScores.pcRepairScore}/100 [${lead.leadScores.pcRepairRating}]`);
      console.log(`    🌐 Network / AMC: ${lead.leadScores.networkingAmcScore}/100 [${lead.leadScores.networkingAmcRating}]`);
      console.log(`    💡 Reason       : ${lead.leadScores.qualificationReason}`);
      console.log(`-------------------------------------------------------------------`);
    });

    console.log(`\n🎉 Process completed successfully!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
