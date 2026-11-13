import { prisma } from '../lib/prisma';

export interface SeedTemplateInput {
  name: string;
  category: string;
  subject: string;
  body: string;
  isDefault: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: SeedTemplateInput[] = [
  {
    name: 'General Business Introduction',
    category: 'General Business Introduction',
    isDefault: true,
    subject: 'A quick idea to help {{businessName}} grow in {{city}}',
    body: `Hello {{contactName}},

I came across {{businessName}} while exploring businesses in {{city}} and wanted to introduce myself.

I'm Jai Shankar. I help businesses improve their digital presence and technical operations through website development, IT support and practical technology solutions.

Depending on your business requirements, I can help with:
• Professional business websites
• Website improvements and maintenance
• Better online visibility
• Computer and IT maintenance
• Reliable technical support

I'd be happy to understand your current requirements and suggest a few practical improvements for {{businessName}}.

Would you be available for a brief 10-minute conversation this week?

Best regards,

Jai Shankar
Contact: 9842139997
Website: https://jspcs.online`,
  },
  {
    name: 'Website Development Proposal',
    category: 'Website Development Proposal',
    isDefault: false,
    subject: 'A website idea for {{businessName}} in {{city}}',
    body: `Hello {{contactName}},

I wanted to reach out to introduce my website development services.

A professional website can help {{businessName}} showcase its services, build customer confidence and receive enquiries even outside regular business hours.

I develop business websites with a focus on:
• Modern and professional design
• Mobile-friendly layouts
• Fast-loading pages
• Clear service presentation
• WhatsApp and enquiry integration
• Search-engine-friendly structure

I would be happy to understand what you need and suggest a website concept suitable for your business.

You can explore my portfolio here:
https://jaishankar-ops.vercel.app/

Would you be interested in discussing a website idea for {{businessName}}?

Best regards,

Jai Shankar
Contact: 9842139997
Portfolio: https://jaishankar-ops.vercel.app/`,
  },
  {
    name: 'Website Redesign Proposal',
    category: 'Website Redesign',
    isDefault: false,
    subject: 'A few website improvement ideas for {{businessName}}',
    body: `Hello {{contactName}},

I wanted to share an idea regarding the online presence of {{businessName}}.

A website is often the first place potential customers visit before contacting a business.

Improving its design, mobile experience, page speed and enquiry flow can make it easier for visitors to understand your services and reach you.

I can help with:
• Modern website redesign
• Mobile responsiveness
• Improved page structure
• Faster page loading
• Better enquiry forms
• WhatsApp contact integration
• Search-engine-friendly improvements

If you're interested, I can share three practical improvement suggestions for your website.

You can also explore my previous development work:
https://jaishankar-ops.vercel.app/

Best regards,

Jai Shankar
Contact: 9842139997
Portfolio: https://jaishankar-ops.vercel.app/`,
  },
  {
    name: 'SEO Improvement Audit',
    category: 'SEO Improvement',
    isDefault: false,
    subject: 'Ideas to improve the online visibility of {{businessName}}',
    body: `Hello {{contactName}},

I wanted to introduce some opportunities that may help improve the online visibility of {{businessName}} in {{city}}.

A well-structured website and properly optimized online presence can help potential customers discover your business more easily.

Depending on your current website, improvement opportunities may include:
• Technical SEO
• Website loading performance
• Mobile usability
• Page titles and metadata
• Search-friendly website structure
• Local search optimization
• Google Business Profile improvements

I can prepare a short list of practical recommendations based on your website.

Would you be interested in receiving a brief SEO improvement checklist?

Best regards,

Jai Shankar
Contact: 9842139997
Portfolio: https://jaishankar-ops.vercel.app/`,
  },
  {
    name: 'Google Business & Online Presence',
    category: 'Google Business / Online Presence',
    isDefault: false,
    subject: 'Helping {{businessName}} get discovered by more local customers',
    body: `Hello {{contactName}},

I came across {{businessName}} while exploring businesses in {{city}}.

I wanted to introduce a few ways to strengthen your online presence and make it easier for nearby customers to discover and contact your business.

Possible improvements include:
• Google Business Profile optimization
• Accurate business information
• Local keyword optimization
• Website and landing page improvements
• Better customer enquiry options
• Consistent online business information

I would be happy to share a few practical suggestions based on your current online presence.

Would you be interested in a short discussion?

Best regards,

Jai Shankar
Contact: 9842139997
Website: https://jspcs.online`,
  },
  {
    name: 'IT Support Services Introduction',
    category: 'IT Support Services',
    isDefault: false,
    subject: 'Computer maintenance & IT support for {{businessName}}',
    body: `Hello {{contactName}},

I'm Jai Shankar from JSPCS.

I work with businesses that depend on computers, printers and IT equipment for their everyday operations.

Unexpected hardware problems, printer issues and network interruptions can affect daily work.

JSPCS provides technical support and maintenance solutions designed to help businesses keep their IT equipment operating reliably.

Our service areas include:
• Desktop and laptop troubleshooting
• Computer maintenance
• Hardware and software support
• Printer installation and troubleshooting
• Network setup and troubleshooting
• Preventive maintenance
• Annual Maintenance Contracts (AMC)
• Business IT support

We would be happy to understand the IT requirements of {{businessName}} and discuss a suitable support arrangement.

Would you be available for a brief conversation?

Best regards,

Jai Shankar
JSPCS
Contact: 9842139997
Website: https://jspcs.online`,
  },
  {
    name: 'Computer Repair & Technical Support',
    category: 'Computer Repair & Technical Support',
    isDefault: false,
    subject: 'Technical support for computers and office systems at {{businessName}}',
    body: `Hello {{contactName}},

I'm Jai Shankar from JSPCS.

If your business ever needs assistance with computer problems, laptop troubleshooting, printer issues or other technical requirements, I'd be glad to help.

Our technical service areas include:
• Desktop and laptop repair
• Operating system and software troubleshooting
• Hardware upgrades and replacement support
• Printer installation and repair
• Computer maintenance
• Network troubleshooting
• On-site support where available

Our aim is to help businesses reduce technical interruptions and keep their systems running smoothly.

If you have any current technical requirements, feel free to contact me.

Best regards,

Jai Shankar
JSPCS
Contact: 9842139997
Website: https://jspcs.online`,
  },
  {
    name: 'Follow-Up Email',
    category: 'Follow-up Email',
    isDefault: false,
    subject: 'Following up on my earlier message to {{businessName}}',
    body: `Hello {{contactName}},

I hope you're doing well.

I wanted to briefly follow up on my earlier message regarding {{serviceName}} for {{businessName}}.

I understand you may be busy, so there's no urgency.

If improving your website, arranging computer maintenance or getting technical support is something you're considering, I'd be happy to discuss a suitable solution.

Please let me know if you'd like to continue the conversation.

Best regards,

Jai Shankar
Contact: 9842139997
Website: https://jspcs.online`,
  },
];

/**
 * Ensures all 8 default reusable email templates exist with official professional copy,
 * updating legacy placeholders without overwriting custom templates.
 */
export async function ensureDefaultTemplates(): Promise<void> {
  for (const tpl of DEFAULT_EMAIL_TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        OR: [
          { name: tpl.name },
          { category: tpl.category },
        ],
      },
    });

    if (!existing) {
      await prisma.emailTemplate.create({
        data: {
          name: tpl.name,
          category: tpl.category,
          subject: tpl.subject,
          body: tpl.body,
          isDefault: tpl.isDefault,
          isHtml: true,
        },
      });
    } else if (
      existing.body.includes('LeadPilot Outreach Team') ||
      existing.body.includes('984213999\n') ||
      !existing.body.includes('9842139997')
    ) {
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          name: tpl.name,
          category: tpl.category,
          subject: tpl.subject,
          body: tpl.body,
          isDefault: tpl.isDefault,
          isHtml: true,
        },
      });
    }
  }
}


