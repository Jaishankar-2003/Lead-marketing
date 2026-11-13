import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import {
  renderTemplate,
  renderProfessionalHtmlEmail,
  getRecommendedTemplate,
  resolveBrandIdentity,
  OFFICIAL_SENDER_NAME,
  OFFICIAL_SENDER_PHONE,
  OFFICIAL_JSPCS_URL,
  OFFICIAL_PORTFOLIO_URL,
} from '../src/lib/outreach-utils';

async function runTemplateTests() {
  console.log('🚀 Running Professional HTML Email Template Verification Suite...\n');

  // 1. Verify Constants
  console.log('1. Checking Mandatory Identity & Contact Requirements...');
  assert.equal(OFFICIAL_SENDER_NAME, 'Jai Shankar');
  assert.equal(OFFICIAL_SENDER_PHONE, '9842139997');
  assert.equal(OFFICIAL_JSPCS_URL, 'https://jspcs.online');
  assert.equal(OFFICIAL_PORTFOLIO_URL, 'https://jaishankar-ops.vercel.app/');
  console.log('  ✅ PASS: Sender name is Jai Shankar');
  console.log('  ✅ PASS: Contact phone is 9842139997');
  console.log('  ✅ PASS: JSPCS URL is https://jspcs.online');
  console.log('  ✅ PASS: Portfolio URL is https://jaishankar-ops.vercel.app/\n');

  // 2. Verify all 8 templates exist in database
  console.log('2. Verifying all 8 Official Templates in Database...');
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: 'asc' },
  });

  assert.equal(templates.length, 8, `Expected 8 templates in database, got ${templates.length}`);

  const expectedTemplates = [
    { name: 'General Business Introduction', category: 'General Business Introduction', brand: 'GENERAL', url: 'https://jspcs.online' },
    { name: 'Website Development Proposal', category: 'Website Development Proposal', brand: 'FREELANCE_WEB', url: 'https://jaishankar-ops.vercel.app/' },
    { name: 'Website Redesign Proposal', category: 'Website Redesign', brand: 'FREELANCE_WEB', url: 'https://jaishankar-ops.vercel.app/' },
    { name: 'SEO Improvement Audit', category: 'SEO Improvement', brand: 'FREELANCE_WEB', url: 'https://jaishankar-ops.vercel.app/' },
    { name: 'Google Business & Online Presence', category: 'Google Business / Online Presence', brand: 'GENERAL', url: 'https://jspcs.online' },
    { name: 'IT Support Services Introduction', category: 'IT Support Services', brand: 'JSPCS', url: 'https://jspcs.online' },
    { name: 'Computer Repair & Technical Support', category: 'Computer Repair & Technical Support', brand: 'JSPCS', url: 'https://jspcs.online' },
    { name: 'Follow-Up Email', category: 'Follow-up Email', brand: 'GENERAL', url: 'https://jspcs.online' },
  ];

  const mockLead = {
    id: 'test_lead_001',
    businessName: 'Madurai Tech Solutions & Labs',
    contactName: 'Sundar Raman',
    city: 'Madurai',
    website: 'https://maduraitech.example.com',
    email: 'contact@maduraitech.example.com',
    phone: '04522500000',
    serviceProspect: 'WEBSITE_DEV',
  };

  for (const exp of expectedTemplates) {
    const tpl = templates.find((t) => t.name === exp.name || t.category === exp.category);
    assert(tpl, `Template not found: ${exp.name}`);

    // Verify template body does not contain legacy strings
    assert(!tpl.body.includes('LeadPilot Outreach Team'), `${exp.name} contains legacy signature`);
    assert(tpl.body.includes('Jai Shankar'), `${exp.name} missing Jai Shankar`);
    assert(tpl.body.includes('9842139997'), `${exp.name} missing contact phone 9842139997`);
    assert(!tpl.body.includes('984213999\n'), `${exp.name} contains incorrect 9-digit phone`);

    // Test rendering
    const renderedSubject = renderTemplate(tpl.subject, mockLead);
    const renderedBody = renderTemplate(tpl.body, mockLead);

    assert(!renderedSubject.includes('{{'), `${exp.name} has unresolved subject placeholders`);
    assert(!renderedBody.includes('{{'), `${exp.name} has unresolved body placeholders`);
    assert(!renderedBody.includes('undefined'), `${exp.name} has undefined in body`);
    assert(!renderedBody.includes('null'), `${exp.name} has null in body`);

    // Compile into professional HTML
    const compiled = renderProfessionalHtmlEmail({
      subject: renderedSubject,
      bodyText: renderedBody,
      lead: mockLead,
      recipientEmail: mockLead.email,
      templateName: tpl.name,
      category: tpl.category,
      unsubscribeUrl: 'https://jspcs.online/unsubscribe?token=sample_token',
    });

    // Verify HTML Technical Requirements
    assert(compiled.html.includes('<!DOCTYPE html'), `${exp.name} missing DOCTYPE`);
    assert(compiled.html.includes('<table'), `${exp.name} missing table-based layout`);
    assert(compiled.html.includes('max-width: 600px'), `${exp.name} missing 600px responsive width`);
    assert(compiled.html.includes('9842139997'), `${exp.name} HTML missing 9842139997`);
    assert(compiled.html.includes('tel:+919842139997'), `${exp.name} HTML missing tel:+919842139997 link`);
    assert(compiled.html.includes(exp.url), `${exp.name} HTML missing correct URL: ${exp.url}`);
    assert(compiled.html.includes('Jai Shankar'), `${exp.name} HTML missing Jai Shankar`);
    assert(compiled.html.includes('opt out here'), `${exp.name} HTML missing unsubscribe text`);
    assert(compiled.html.includes('Direct Business Contact'), `${exp.name} HTML missing contact box`);

    // Verify Plain-Text Fallback
    assert(compiled.text.includes('9842139997'), `${exp.name} Text missing 9842139997`);
    assert(compiled.text.includes('Jai Shankar'), `${exp.name} Text missing Jai Shankar`);
    assert(compiled.text.includes(exp.url), `${exp.name} Text missing ${exp.url}`);
    assert(compiled.text.includes('opt out of future messages'), `${exp.name} Text missing opt-out link`);

    console.log(`  ✅ PASS: ${exp.name} verified (HTML + PlainText + Phone + URL)`);
  }

  // 3. Test XSS and Dynamic Escaping
  console.log('\n3. Testing Security Escaping & Malicious Payload Neutralization...');
  const maliciousLead = {
    businessName: '<script>alert("xss")</script> & "Cookies"',
    contactName: '<b>Admin</b>',
    city: 'Madurai <img src=x onerror=alert(1)>',
    website: 'https://evil.com?param="><script>',
    email: 'test@example.com',
  };

  const xssCompiled = renderProfessionalHtmlEmail({
    subject: 'Idea for {{businessName}}',
    bodyText: 'Hello {{contactName}}, we reviewed {{businessName}} in {{city}} at {{website}}',
    lead: maliciousLead,
    templateName: 'Website Development Proposal',
  });

  assert(!xssCompiled.html.includes('<script>'), 'Unescaped <script> tag leaked into HTML email');
  assert(!xssCompiled.html.includes('<img'), 'Unescaped <img> tag leaked into HTML email');
  assert(!xssCompiled.html.includes('<b>Admin</b>'), 'Unescaped <b> tag leaked into HTML email');
  assert(xssCompiled.html.includes('&lt;script&gt;'), 'Script tag not properly escaped');
  assert(xssCompiled.html.includes('&lt;img'), 'Img tag not properly escaped');
  console.log('  ✅ PASS: All dynamic lead variables are securely HTML-escaped');

  // 4. Test Intelligent Recommendation Engine
  console.log('\n4. Testing Intelligent Template Recommendation Engine (Phase 5)...');
  const noSiteLead = { businessName: 'Fresh Bakery', category: 'Bakery', website: null, phone: '9842000000' };
  assert.equal(getRecommendedTemplate(noSiteLead).templateName, 'Website Development Proposal');
  console.log('  ✅ PASS: Lead with no website recommends "Website Development Proposal"');

  const lowSeoLead = { businessName: 'Slow Agency', category: 'Services', website: 'https://slow.com', seoScore: 45 };
  assert.equal(getRecommendedTemplate(lowSeoLead).templateName, 'SEO Improvement Audit');
  console.log('  ✅ PASS: Lead with low SEO score (45/100) recommends "SEO Improvement Audit"');

  const repairLead = { businessName: 'Madurai Laptop Clinic', category: 'Computer Repair Service', website: 'https://clinic.com' };
  assert.equal(getRecommendedTemplate(repairLead).templateName, 'Computer Repair & Technical Support');
  console.log('  ✅ PASS: Lead with computer repair category recommends "Computer Repair & Technical Support"');

  const itLead = { businessName: 'St. Joseph Academy', category: 'School Office', website: 'https://stjoseph.edu', serviceProspect: 'PC_SUPPORT' };
  assert.equal(getRecommendedTemplate(itLead).templateName, 'IT Support Services Introduction');
  console.log('  ✅ PASS: School / AMC profile recommends "IT Support Services Introduction"');

  const contactedLead = { businessName: 'Prior Lead', category: 'Store', website: 'https://store.com', crmStatus: 'CONTACTED' };
  assert.equal(getRecommendedTemplate(contactedLead).templateName, 'Follow-Up Email');
  console.log('  ✅ PASS: Previously contacted lead recommends "Follow-Up Email"');

  console.log('\n🎉 ALL 8 EMAIL TEMPLATES & HTML COMPILER TESTS PASSED PERFECTLY!\n');
}

runTemplateTests()
  .catch((e) => {
    console.error('Template tests failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
